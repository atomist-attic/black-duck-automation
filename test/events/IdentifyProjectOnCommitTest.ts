import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter = require("axios-mock-adapter");

import { EventFired } from "@atomist/automation-client/Handlers";

import {IdentifyProjectOnCommit} from "../../src/events/IdentifyProjectOnCommit";
import {Commit} from "../../src/typings/types";
import {ProjectProperties} from "../../src/util/ProjectPropertiesExtractor";

describe("IdentifyProjectOnCommit", () => {

    const handler = new class extends IdentifyProjectOnCommit {
        protected getProjectProperties(repo: Commit.Repo, sha: string):
                Promise<ProjectProperties> {
            return Promise.resolve({
                group: "atomist",
                name: "p1",
                version: "1.0.3",
            } as ProjectProperties);
        }
    }();

    it("should identify project and send fingerprint", done => {
        const event = {
            data: {
                Commit: [{
                    sha: "123",
                    repo: {
                        name: "project1",
                        owner: "atomisthq",
                    },
                }],
            },
        } as EventFired<Commit.Subscription>;

        const mock = new MockAdapter(axios);
        mock.onPost(`https://webhook.atomist.com/atomist/fingerprints/teams/team123`)
            .replyOnce(config => {
                const expectedRequest = {
                    commit: {
                        provider: "https://www.github.com",
                        owner: "atomisthq",
                        repo: "project1",
                        sha: "123",
                    },
                    fingerprints: [{
                        name: "ProjectIdentification",
                        version: "1.0",
                        abbrevation: "prid",
                        data: {
                            group: "atomist",
                            name: "p1",
                            version: "1.0.3",
                        },
                        value: {
                            group: "atomist",
                            name: "p1",
                            version: "1.0.3",
                        },
                    }],
                };
                assert.deepEqual(JSON.parse(config.data), expectedRequest);
                return [200];
            });

        handler.handle(event, {
            teamId: "team123",
            messageClient: undefined,
            correlationId: undefined,
        })
            .then(() => done(), done);
    });

});
