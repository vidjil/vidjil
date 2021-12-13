
# Release cycles

The Vidjil project tries to keep [agile develompent](https://en.wikipedia.org/wiki/Agile_software_development) while producing certified, qualified healthcare software for clinical needs.
See also our [roadmap](roadmap.md).

- We target [continuous delivery](https://en.wikipedia.org/wiki/Continuous_delivery)
  on the public server [app.vidjil.org](http://app.vidjil.org).
  As of 2021, 
  <ul>
    <li> the client is intended to be semi-automatically deployed through Gitlab, 
    <li> the server is manually deployed,
    <li> the analysis engine [vidjil-algo](vidjil-algo.md), which follows his own release cycles, is manually deployed.
  </ul> 
  New releases with incremental changes may thus be deployed on-the-fly, but a notification is issued on the server.
  However, we announce the most significant features impacting data analysis with a 2-week notice.
  
- The [healthcare servers](healthcare.md) get a major release twice a year, in June and December,
  of all their components (client, server, analysis engine).
  Any release on the healthcare server is intended to be in production for at least *one month* on the public server.
  Such a release is further *qualified* with interaction with members of the [VidjilNet consortium](http://www.vidjil.net)
  on their qualification datasets.

Critical bug fixes can be deployed on both public and healthcare servers at any time.
To help the development to move forward towards such stable healthcare releases,
several [freeze](https://en.wikipedia.org/wiki/Freeze_(software_engineering)) windows are enforced.

|  | Summer release ☀️ |  Winter release ❄️ |
|--|--|--|
| Meeting on release objectives | mid-February | begin-September |
| *Dev: Main Freeze* <br /> Any new feature merge must be discussed. | 30 March | 31 September |
| *Dev: Hard Freeze* <br /> No more feature merge, only bug fixes. <br /> Polish strings, documentation, release notes, and announcements. | 15 April | 15 October |
| *Deploy on the public server* <br/>Continuous deployment on the public server is freezed, except for critical bug fixes. | before 30 April | before 30 October |
| *Deploy stable release on healthcare servers and qualification* <br />Continuous deployment on the public servers resumes. |  June   |  December |


For [server maintainers](server.md), the last stable release of the complete Vidjil platform is available on <https://hub.docker.com/u/vidjil>. 
For bioinformaticians, the last stable release of the [vidjil-algo](vidjil-algo.md) analysis engine is available on <http://www.vidjil.org/releases/vidjil-latest.tar.gz>.