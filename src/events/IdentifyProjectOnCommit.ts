import {
    EventFired,
    EventHandler,
    failure,
    GraphQL,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger, MappedParameter, MappedParameters, Secret, Secrets,
    Success,
    success,
    Tags,
} from "@atomist/automation-client";
import axios from "axios";

import {GitHubRepoRef} from "@atomist/automation-client/operations/common/GitHubRepoRef";
import {GitCommandGitProject} from "@atomist/automation-client/project/git/GitCommandGitProject";
import * as graphql from "../typings/types";
import {ProjectProperties, ProjectPropertiesExtractor} from "../util/ProjectPropertiesExtractor";

@EventHandler("fingerprint a commit with project identification",
    GraphQL.subscriptionFromFile("../graphql/commitWithProjectIdFingerprint", __dirname))
@Tags("blackDuck", "status")
export class IdentifyProjectOnCommit implements
    HandleEvent<graphql.CommitWithProjectIdFingerprint.Subscription> {

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    public handle(e: EventFired<graphql.CommitWithProjectIdFingerprint.Subscription>, ctx: HandlerContext):
            Promise<HandlerResult> {
        logger.debug(`incoming event is ${JSON.stringify(e.data)}`);
        const commit = e.data.Commit[0];
        const repo = commit.repo;
        const sha = commit.sha;
        return this.getProjectProperties(repo, sha).then(projectProperties => {
            const atomistWebhook = `http://webhook.atomist.com/atomist/fingerprints/teams/${this.teamId}`;
            const fingerprint = {
                commit: {
                    provider: "https://www.github.com",
                    owner: repo.owner,
                    repo: repo.name,
                    sha,
                },
                fingerprints: [
                    {
                        name: "ProjectIdentification",
                        version: "1.0",
                        // sha: "",
                        abbrevation: "prid",
                        data: projectProperties,
                    },
                ],
            };
            return axios.post(atomistWebhook, fingerprint);
        }).then(result => {
            return success();
        });
    }

    protected getProjectProperties(repo: graphql.CommitWithProjectIdFingerprint.Repo, sha: string):
            Promise<ProjectProperties> {
        return GitCommandGitProject.cloned(
            { token: this.githubToken },
            new GitHubRepoRef(repo.owner, repo.name, sha),
        ).then(project => {
            return new ProjectPropertiesExtractor().getProjectProperties(project);
        });
    }
}
