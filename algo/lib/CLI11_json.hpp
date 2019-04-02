
class ConfigJSON : public CLI::Config {

  std::string to_config(const CLI::App *app, bool default_also, bool, std::string) const override ;

  std::vector<CLI::ConfigItem> from_config(std::istream &input) const override ;

} ;


