import {
    EventFired,
    EventHandler,
    GraphQL,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger, Secret, Secrets,
    success,
    Tags,
} from "@atomist/automation-client";
import axios from "axios";

import {GitHubRepoRef} from "@atomist/automation-client/operations/common/GitHubRepoRef";
import {GitCommandGitProject} from "@atomist/automation-client/project/git/GitCommandGitProject";
import * as graphql from "../typings/types";
import {ProjectProperties, ProjectPropertiesExtractor} from "../util/ProjectPropertiesExtractor";

@EventHandler("fingerprint a commit with project identification",
    GraphQL.subscriptionFromFile("../graphql/commit", __dirname))
@Tags("blackDuck", "status")
export class IdentifyProjectOnCommit implements
    HandleEvent<graphql.Commit.Subscription> {

    @Secret(Secrets.OrgToken)
    public githubToken: string;

    public handle(e: EventFired<graphql.Commit.Subscription>, ctx: HandlerContext):
            Promise<HandlerResult> {
        const commit = e.data.Commit[0];
        const repo = commit.repo;
        const sha = commit.sha;
        return this.getProjectProperties(repo, sha).then(projectProperties => {
            const atomistWebhook = `http://webhook.atomist.com/atomist/fingerprints/teams/${ctx.teamId}`;
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

    protected getProjectProperties(repo: graphql.Commit.Repo, sha: string):
            Promise<ProjectProperties> {
        return GitCommandGitProject.cloned(
            { token: this.githubToken },
            new GitHubRepoRef(repo.owner, repo.name, sha),
        ).then(project => {
            return new ProjectPropertiesExtractor().getProjectProperties(project);
        });
    }
}