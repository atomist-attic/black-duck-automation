import "mocha";
import * as assert from "power-assert";

import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import {fail} from "power-assert";
import {RiskProfile} from "../../src/blackDuck/BlackDuckService";
import {RetrieveBlackDuckRiskProfile} from "../../src/events/RetrieveBlackDuckRiskProfile";

describe("RetrieveBlackDuckRiskProfile", () => {

    const status = {
        context: "black-duck/hub-detect",
        targetUrl: "http://bdHub.com",
    };

    const statusWithDesc = {
        context: "black-duck/hub-detect",
        targetUrl: "http://bdHub.com",
        description: "black duck hub detect ran",
    };

    const statusWithOverrides = {
        context: "black-duck/hub-detect",
        targetUrl: "http://bdHub.com",
        description: `{ "name": "p2", "version": "2.0.0" }`,
    };

    const fingerprint = {
        name: "ProjectIdentification",
        data: `{
                "group": "atomist",
                "name": "p1",
                "version": "1.0.3"
            }`,
    };

    it("should find risk profile and send fingerprint", done => {
        const retriever = new class extends RetrieveBlackDuckRiskProfile {
            protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string):
                    Promise<RiskProfile> {
                return Promise.resolve({
                    categories: [{
                        vulnerabilities: {
                            url,
                            projectName,
                            projectVersion,
                        },
                    }],
                } as RiskProfile);
            }
        }({
            name: "project1",
            owner: "atomisthq",
        }, "team123");

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
                        name: "BlackDuckRiskProfile",
                        version: "1.0",
                        abbrevation: "bdrp",
                        data: {
                            categories: [{
                                vulnerabilities: {
                                    url: "http://bdHub.com",
                                    projectName: "p1",
                                    projectVersion: "1.0.3",
                                },
                            }],
                        },
                        value: {
                            categories: [{
                                vulnerabilities: {
                                    url: "http://bdHub.com",
                                    projectName: "p1",
                                    projectVersion: "1.0.3",
                                },
                            }],
                        },
                    }],
                };
                assert.deepEqual(JSON.parse(config.data), expectedRequest);
                return [200];
            });

        retriever.retrieve(status, fingerprint, "123")
            .then(() => done(), done);
    });

    it("should find risk profile and send fingerprint ignoring status description", done => {
        const retriever = new class extends RetrieveBlackDuckRiskProfile {
            protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string):
            Promise<RiskProfile> {
                assert.deepEqual(projectName, "p1");
                assert.deepEqual(projectVersion, "1.0.3");
                return Promise.resolve({
                    categories: [],
                } as RiskProfile);
            }
        }({
            name: "project1",
            owner: "atomisthq",
        }, "team123");

        const mock = new MockAdapter(axios);
        mock.onPost(`https://webhook.atomist.com/atomist/fingerprints/teams/team123`)
            .replyOnce(config => {
                return [200];
            });

        retriever.retrieve(statusWithDesc, fingerprint, "123")
            .then(() => done(), done);
    });

    it("should find risk profile and send fingerprint with overrides", done => {
        const retriever = new class extends RetrieveBlackDuckRiskProfile {
            protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string):
            Promise<RiskProfile> {
                assert.deepEqual(projectName, "p2");
                assert.deepEqual(projectVersion, "2.0.0");
                return Promise.resolve({
                    categories: [],
                } as RiskProfile);
            }
        }({
            name: "project1",
            owner: "atomisthq",
        }, "team123");

        const mock = new MockAdapter(axios);
        mock.onPost(`https://webhook.atomist.com/atomist/fingerprints/teams/team123`)
            .replyOnce(config => {
                return [200];
            });

        retriever.retrieve(statusWithOverrides, fingerprint, "123")
            .then(() => done(), done);
    });

    it("should not access risk profile if fingerprint is missing", done => {
        const retriever = new class extends RetrieveBlackDuckRiskProfile {
            protected blackDuckRiskProfile(url: string, projectName: string, projectVersion: string):
                    Promise<RiskProfile> {
                assert.deepEqual(projectName, "p2");
                assert.deepEqual(projectVersion, "2.0.0");
                return Promise.resolve({
                    categories: [],
                } as RiskProfile);
            }
        }({
            name: "project1",
            owner: "atomisthq",
        }, "team123");

        const mock = new MockAdapter(axios);
        mock.onPost(`https://webhook.atomist.com/atomist/fingerprints/teams/team123`)
            .replyOnce(config => {
                return [200];
            });

        retriever.retrieve(statusWithOverrides, undefined, "123")
            .then(() => done(), done);
    });

});
