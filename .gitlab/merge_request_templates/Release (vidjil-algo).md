
## Before the release

### Documentation

* [ ] New features are described in `doc/vidjil-algo.md`, with the proper release tag
* [ ] Breaking changes (and needed configuration changes) are understood
 
On the `feature-a/release` branch, the last commit is the release commit updating the two following files:
 * [ ] CHANGELOG
 * [ ] `algo/release` with the proper release tag

### Pipelines

https://gitlab.inria.fr/vidjil/vidjil/pipelines/XXXXX
(if tests passed on different pipelines, indicate below the relevant pipelines)

Usual tests should pass
* [ ] valgrind_unit: job XXX
* [ ] valgrind_functional: job XXX
* [ ] multiple_tests: job XXX

Benchmarks: job XXX
* [ ] almost no change...
* [ ] ... or significant changes are understood

When there are significant changes in the benchmarks, study the profiling
* cpu: WindowExtractor.extract, ~60%, including ~45% from KmerSegmenter ?
* mem: PointerACAutomaton.insert, ~75% ?
* [ ] ... 

## The release, publish, tag and push

* [ ] merge this MR to *master* and tag: `git tag release-20XX.XX` 
* [ ] push: `git push origin master release-20XX.XX`
* [ ] mirror to GH: `git push github master release-20XX.XX`
* [ ] deploy to vidjil.org/releases and app.vidjil.org: click on `copy_release` (there may be changes to CD...)
* [ ] deploy the doc: click on `deploy_doc`


After these steps, we merge back the release in `dev`:
* [ ] merge this MR to dev

## After the release: deploy

* [ ] Click `deploy_release_prod` in the `deploy_prod` stage, deploying the release on `vidjil-algo-next` on the public server
* [ ] Open a new internal issue with the `Deploy (vidjil-algo)` template : vdj#XXXXX

* [ ] Possibly fix things in `merge_request_templates/Release (vidjil-algo).md` on a new MR

* [ ] Close the milestone associated with this release, moving remaining issues on another milestone

/label ~cpp

