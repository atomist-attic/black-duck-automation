import * as _ from "lodash";
import "mocha";
import * as assert from "power-assert";

import { LoggingConfig } from "@atomist/automation-client/internal/util/logger";

import {GitHubRepoRef} from "@atomist/automation-client/operations/common/GitHubRepoRef";
import {GitCommandGitProject} from "@atomist/automation-client/project/git/GitCommandGitProject";
import {LocalProject} from "@atomist/automation-client/project/local/LocalProject";
import {InMemoryProject} from "@atomist/automation-client/project/mem/InMemoryProject";
import {ProjectPropertiesExtractor} from "../../src/util/ProjectPropertiesExtractor";

LoggingConfig.format = "cli";

describe("ProjectPropertiesExtractor", () => {

    const extractor = new class extends ProjectPropertiesExtractor {
        public executeCommand(cwd: string, command: string): string {
            return `:properties

------------------------------------------------------------
Root project - atomist spring seed
------------------------------------------------------------

assemble: task ':assemble'
group: com.atomist
name: atomist-spring-seed
version: 1.0.0-SNAPSHOT

BUILD SUCCESSFUL in 0s
1 actionable task: 1 executed
`;
        }
    }();

    it("should extract project properties from Gradle project", () => {
        const project: LocalProject = _.assignIn(
            InMemoryProject.of(
                {
                    path: "gradlew",
                    content: "",
                },
            ),
            {baseDir: "cwd", release: undefined},
        );
        const projectProperties = extractor.getProjectProperties(project);
        assert.deepEqual(projectProperties, {
            group: "com.atomist",
            name: "atomist-spring-seed",
            version: "1.0.0-SNAPSHOT",
        });
    });

    it("should not extract project properties from unknown project type", () => {
        const project: LocalProject = _.assignIn(
            InMemoryProject.of(
                {
                    path: "ant",
                    content: "",
                },
            ),
            {baseDir: "cwd", release: undefined},
        );
        const projectProperties = extractor.getProjectProperties(project);
        assert.deepEqual(projectProperties, undefined);
    });

});
