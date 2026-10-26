// Cucumber do BDD do fluxo completo (seção "BDD do fluxo completo" do README).
// Os passos são TypeScript, carregados pelo ts-node sem checagem de tipos (o
// lint do projeto já cobre test/**).
module.exports = {
  default: {
    paths: ['test/bdd/features/**/*.feature'],
    requireModule: ['ts-node/register/transpile-only'],
    require: ['test/bdd/support/**/*.ts', 'test/bdd/steps/**/*.ts'],
    format: ['pretty', 'html:test/bdd/relatorio/cucumber.html'],
  },
};
