import {
    EventFired,
    EventHandler,
    failure,
    GraphQL,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger, MappedParameter, MappedParameters, Secret,
    Success,
    success,
    Tags,
} from "@atomist/automation-client";
import axios from "axios";

import {configuration} from "../atomist.config";
import {BlackDuckService, RiskProfile} from "../blackDuck/BlackDuckService";
import * as graphql from "../typings/types";

@EventHandler("retrieve Black Duck risk profile when there is a status",
    GraphQL.subscriptionFromFile("../graphql/blackDuckStatus", __dirname))
@Tags("blackDuck", "status")
export class RetrieveBlackDuckRiskProfileOnStatus implements HandleEvent<graphql.BlackDuckStatus.Subscription> {

    public blackDuckUser: string = configuration.blackDuck.user;
    public blackDuckPassword: string = configuration.blackDuck.password;

    public handle(e: EventFired<graphql.BlackDuckStatus.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        const blackDuckStatus = e.data.Status[0];
        const blackDuckUrl = blackDuckStatus.targetUrl;
        const repo = blackDuckStatus.commit.repo;
        const sha = blackDuckStatus.commit.sha;
        const projectIdFp = blackDuckStatus.commit.fingerprints.find(f => f.name === "ProjectIdentification");
        if (!projectIdFp) { return Promise.resolve(success()); }
        const projectIdFpData = JSON.parse(projectIdFp.data);
        const projectName = projectIdFpData.name;
        const projectVersion = projectIdFpData.version;
        const atomistWebhook = `http://webhook.atomist.com/atomist/fingerprints/teams/${ctx.teamId}`;
        return this.blackDuckRiskProfile(blackDuckUrl, projectName, projectVersion)
            .then(riskProfile => {
                const fingerprint = {
                    commit: {
                        provider: "https://www.github.com",
                        owner: repo.owner,
                        repo: repo.name,
                        sha,
                    },
                    fingerprints: [
                        {
                            name: "BlackDuckRiskProfile",
                            version: "1.0",
                            // sha: "",
                            abbrevation: "bdrp",
                            data: riskProfile,
                        },
                    ],
                };
                return axios.post(atomistWebhook, fingerprint);
            }).then(result => {
                return success();
            });
    }

    protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string): Promise<RiskProfile> {
        const blackDuckService = new BlackDuckService(url, this.blackDuckUser, this.blackDuckPassword);
        return blackDuckService.getRiskProfile(projectName, projectVersion);
    }
}
