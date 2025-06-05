
# Release cycles

The Vidjil project tries to keep [agile development practices](https://en.wikipedia.org/wiki/Agile_software_development) while producing certified, qualified healthcare software for clinical needs.
See also our [roadmap](roadmap.md).

- We target [continuous delivery](https://en.wikipedia.org/wiki/Continuous_delivery)
  on the public server [app.vidjil.org](https://app.vidjil.org).
  As of 2021,
    - the client is intended to be semi-automatically deployed through Gitlab,
    - the server is manually deployed,
    - the analysis engine [vidjil-algo](vidjil-algo.md), which follows his own release cycles, is manually deployed.
      New releases with incremental changes may thus be deployed on-the-fly, but a notification is issued on the server.
      However, we announce the most significant features impacting data analysis with a 2-week notice.
  
- The [healthcare servers](healthcare.md) get a major release of all their components (client, server, analysis engine) twice a year, in June and December. Any deployment on the healthcare server should have been running on the public server for at least *one month* before. Such a release is further *qualified* through interactions with members of the [VidjilNet consortium](https://www.vidjil.net) on their qualification datasets.

Critical bug fixes can be deployed on both public and healthcare servers at any time.
To help the development move forward towards such stable healthcare releases, several [freeze](https://en.wikipedia.org/wiki/Freeze_(software_engineering)) windows are enforced.

|  | Summer release ☀️ |  Winter release ❄️ |
|--|--|--|
| Meeting on release objectives | mid-February | early-September |
| *Dev: Main Freeze* <br /> Any new feature merge must be discussed. | 30 March | 30 September |
| *Dev: Hard Freeze* <br /> No more feature merge, only bug fixes. <br /> Polish strings, documentation, release notes, and announcements. | 15 April | 15 October |
| *Deploy on the public server* <br/>Continuous deployment on the public server is frozen, except for critical bug fixes. | before 30 April | before 30 October |
| *Deploy stable release on healthcare servers and qualification* <br />Continuous deployment on the public servers resumes. |  June   |  December |

For [server maintainers](server.md), the latest stable release of the complete Vidjil platform is available on [DockerHub](https://hub.docker.com/u/vidjil).
For bioinformaticians, the latest stable release of the [vidjil-algo](vidjil-algo.md) analysis engine is available directly on [Vidjil's website](https://www.vidjil.org/releases/vidjil-latest.tar.gz).
