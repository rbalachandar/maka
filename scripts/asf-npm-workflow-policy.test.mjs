/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(
  resolve(import.meta.dirname, '../.github/workflows/asf-npm-candidate.yml'),
  'utf8',
);
const validationWorkflow = readFileSync(
  resolve(import.meta.dirname, '../.github/workflows/cli-package-validation.yml'),
  'utf8',
);

test('ASF npm candidate workflow binds one validated tarball to the source RC without publishing', () => {
  assert.match(workflow, /^permissions:\n  contents: read$/mu);
  assert.ok(workflow.includes('if [[ "$RELEASE_REPOSITORY" != "apache/maka" ]]'));
  assert.match(workflow, /RELEASE_REPOSITORY: \$\{\{ github\.repository \}\}/u);
  assert.match(workflow, /SOURCE_REFERENCE_TAG: \$\{\{ github\.ref_name \}\}/u);
  assert.ok(workflow.includes('if [[ "$RELEASE_REF" != "refs/tags/$SOURCE_REFERENCE_TAG" ]]'));
  assert.ok(workflow.includes('git cat-file -t "refs/tags/$SOURCE_REFERENCE_TAG"'));
  assert.ok(workflow.includes('git rev-parse "refs/tags/$SOURCE_REFERENCE_TAG^{commit}"'));
  assert.match(
    workflow,
    /uses: \.\/\.github\/workflows\/cli-package-validation\.yml[\s\S]*?source_commit: \$\{\{ github\.sha \}\}/u,
  );
  assert.match(validationWorkflow, /release_candidate_run_attempt:/u);
  assert.doesNotMatch(validationWorkflow, /\.tgz\.sha512/u);
  assert.match(
    workflow,
    /VALIDATE_RUN_ATTEMPT: \$\{\{ needs\.validate\.outputs\.release_candidate_run_attempt \}\}/u,
  );
  assert.ok(workflow.includes('if [[ "$VALIDATE_RUN_ATTEMPT" != "$CURRENT_RUN_ATTEMPT" ]]'));
  assert.match(
    workflow,
    /artifact-ids: \$\{\{ needs\.validate\.outputs\.release_candidate_artifact_id \}\}/u,
  );
  assert.match(workflow, /name: Revalidate the live source reference[\s\S]*?git merge-base/u);
  assert.match(workflow, /packages\/cli\/release\/\*\.tgz\.sha512/u);
  assert.match(workflow, /packages\/cli\/release\/\*\.tgz\.asf-candidate\.json/u);
  assert.doesNotMatch(workflow, /id-token: write|npm (?:stage )?publish|npm dist-tag/u);
});
