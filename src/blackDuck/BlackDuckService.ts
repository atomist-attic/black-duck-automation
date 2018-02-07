import { logger } from "@atomist/automation-client/internal/util/logger";
import axios from "axios";

export interface RiskProfile {
    bomLastUpdatedAt: string;
    categories: any;
}

export interface AuthHeaders {
    cookie: string;
}

export class BlackDuckService {
    constructor(private url: string, private userName: string, private password: string) {}

    public getRiskProfile(projectName: string, projectVersion: string): Promise<RiskProfile> {
        return this.auth().then(authHeaders => {
            const headers = authHeaders;
            return axios.get(`${this.url}/api/projects`, {
                headers,
                params: {
                    q: `name:${projectName}`,
                },
            }).then(projects => {
                const project = projects.data.items.find(item => item.name === projectName);
                if (!project) { return undefined; }
                const versionsLink = project._meta.links.find(link => link.rel === "versions");
                return axios.get(versionsLink.href, {
                        headers,
                        params: {
                            q: `versionName:${projectVersion}`,
                        },
                    }).then(versions => {
                        const version = versions.data.items.find(item => item.versionName === projectVersion);
                        if (!version) { return undefined; }
                        const riskProfileLink = version._meta.links.find(link => link.rel === "riskProfile");
                        return axios.get(riskProfileLink.href, {headers})
                            .then(riskProfile => {
                                return riskProfile.data;
                            });
                    });
            }).catch(e => {
                logger.error(e.message);
            });
        });
    }

    public auth(): Promise<AuthHeaders> {
        return axios.post(`${this.url}/j_spring_security_check`,
            `j_username=${this.userName}&j_password=${this.password}`,
        ).then(authResponse => {
                const cookie: string = authResponse.headers["set-cookie"][0];
                const jSessionId = cookie.slice(0, -(";path=/;HttpOnly".length));
                return {
                    cookie: jSessionId,
                };
            },
        );
    }

}
