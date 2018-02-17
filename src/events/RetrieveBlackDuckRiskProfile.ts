
import axios from "axios";

import { doWithRetry } from "@atomist/automation-client/util/retry";

import {configuration} from "../atomist.config";
import {BlackDuckService, RiskProfile} from "../blackDuck/BlackDuckService";
import {BlackDuckStatus} from "../typings/types";
import Fingerprints = BlackDuckStatus.Fingerprints;
import Status = BlackDuckStatus.Status;
import Repo = BlackDuckStatus.Repo;

export class RetrieveBlackDuckRiskProfile {
    private blackDuckUser: string = configuration.blackDuck.user;
    private blackDuckPassword: string = configuration.blackDuck.password;

    constructor(private repo: Repo, private teamId: string) {}

    public retrieve(blackDuckStatus: Status, projectIdFp: Fingerprints, sha: string): Promise<any> {
        if (!blackDuckStatus || !projectIdFp) { return Promise.resolve(undefined); }
        const blackDuckUrl = blackDuckStatus.targetUrl;
        const projectIdFpData = JSON.parse(projectIdFp.data);
        const projectName = projectIdFpData.name;
        const projectVersion = projectIdFpData.version;
        const atomistWebhook = `https://webhook.atomist.com/atomist/fingerprints/teams/${this.teamId}`;
        return this.blackDuckRiskProfile(blackDuckUrl, projectName, projectVersion)
            .then(riskProfile => {
                const fingerprint = {
                    commit: {
                        provider: "https://www.github.com",
                        owner: this.repo.owner,
                        repo: this.repo.name,
                        sha,
                    },
                    fingerprints: [
                        {
                            name: "BlackDuckRiskProfile",
                            version: "1.0",
                            // sha: "",
                            abbrevation: "bdrp",
                            data: riskProfile,
                            value: riskProfile,
                        },
                    ],
                };
                return doWithRetry(() => axios.post(atomistWebhook, fingerprint),
                    `send Black Duck risk profile fingerprint`,
                    {
                        minTimeout: 500,
                        retries: 5,
                    });
            });
    }

    protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string): Promise<RiskProfile> {
        const blackDuckService = new BlackDuckService(url, this.blackDuckUser, this.blackDuckPassword);
        return blackDuckService.getRiskProfile(projectName, projectVersion);
    }
}
