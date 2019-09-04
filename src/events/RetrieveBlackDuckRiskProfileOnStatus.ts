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
import { RetrieveBlackDuckRiskProfile } from "./RetrieveBlackDuckRiskProfile";

@EventHandler("retrieve Black Duck risk profile when there is a status",
    GraphQL.subscriptionFromFile("../graphql/blackDuckStatus", __dirname))
@Tags("blackDuck", "status")
export class RetrieveBlackDuckRiskProfileOnStatus
    implements HandleEvent<graphql.BlackDuckStatus.Subscription> {

    public handle(e: EventFired<graphql.BlackDuckStatus.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        logger.debug(`incoming event is ${JSON.stringify(e.data)}`);
        const blackDuckStatus = e.data.Status[0];
        const projectIdFp = blackDuckStatus.commit.fingerprints.find(f => f.name === "ProjectIdentification");
        return new RetrieveBlackDuckRiskProfile(blackDuckStatus.commit.repo, ctx.teamId)
            .retrieve(blackDuckStatus, projectIdFp, blackDuckStatus.commit.sha)
            .then(result => {
                return success();
            });
    }

}
