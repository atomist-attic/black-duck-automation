import {
    EventFired,
    EventHandler,
    GraphQL,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger,
    success,
    Tags,
} from "@atomist/automation-client";
import * as graphql from "../typings/types";
import {RetrieveBlackDuckRiskProfile} from "./RetrieveBlackDuckRiskProfile";

@EventHandler("retrieve Black Duck risk profile when there is a project ID fingerprint",
    GraphQL.subscriptionFromFile("../graphql/projectIdFingerprint", __dirname))
@Tags("blackDuck", "fingerprint")
export class RetrieveBlackDuckRiskProfileOnProjectIdFingerprint
    implements HandleEvent<graphql.ProjectIdFingerprint.Subscription> {

    public handle(e: EventFired<graphql.ProjectIdFingerprint.Subscription>, ctx: HandlerContext):
            Promise<HandlerResult> {
        logger.debug(`incoming event is ${JSON.stringify(e.data)}`);
        const projectIdFp = e.data.Fingerprint[0];
        const blackDuckStatus = projectIdFp.commit.statuses.find(c => c.context === "black-duck/hub-detect");
        return new RetrieveBlackDuckRiskProfile(projectIdFp.commit.repo, ctx.teamId)
            .retrieve(blackDuckStatus, projectIdFp, projectIdFp.commit.sha)
            .then(result => {
                return success();
            });
    }

}
