import { logger } from "@atomist/automation-client/internal/util/logger";
import axios from "axios";

import { doWithRetry } from "@atomist/automation-client/util/retry";

export interface RiskProfile {
    bomLastUpdatedAt: string;
    categories: any;
}

export interface AuthHeaders {
    cookie: string;
}

const retryConfig = {
    minTimeout: 500,
    retries: 5,
};

export class BlackDuckService {
    constructor(private url: string, private userName: string, private password: string) {}

    public getRiskProfile(projectName: string, projectVersion: string): Promise<RiskProfile> {
        return this.auth().then(authHeaders => {
            const headers = authHeaders;
            const blackDuckProjectsCall = () => axios.get(`${this.url}/api/projects`, {
                headers,
                params: {
                    q: `name:${projectName}`,
                },
            });
            return doWithRetry(blackDuckProjectsCall, `black duck projects`, retryConfig)
                .then(projects => {
                const project = projects.data.items.find(item => item.name === projectName);
                if (!project) { return undefined; }
                const versionsLink = project._meta.links.find(link => link.rel === "versions");
                const blackDuckVersionsCall = () => axios.get(versionsLink.href, {
                    headers,
                    params: {
                        q: `versionName:${projectVersion}`,
                    },
                });
                return doWithRetry(blackDuckVersionsCall, `black duck versions`, retryConfig)
                .then(versions => {
                    const version = versions.data.items.find(item => item.versionName === projectVersion);
                    if (!version) { return undefined; }
                    const riskProfileLink = version._meta.links.find(link => link.rel === "riskProfile");
                    const blackDuckRiskProfileCall = () => axios.get(riskProfileLink.href, { headers });
                    return doWithRetry(blackDuckRiskProfileCall, `black duck risk profile`, retryConfig)
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
        const url = `${this.url}/j_spring_security_check`;
        const authData = `j_username=${this.userName}&j_password=${this.password}`;
        const blackDuckAuthCall = () => axios.post(url, authData);
        return doWithRetry(blackDuckAuthCall, `black duck auth`, retryConfig)
            .then(authResponse => {
                const cookie: string = authResponse.headers["set-cookie"][0];
                const jSessionId = cookie.slice(0, -(";path=/;HttpOnly".length));
                return {
                    cookie: jSessionId,
                };
            },
        );
    }

}
