// Run tests in a fixed zone that is not UTC, so date handling that silently relies on the host
// zone fails on every machine, including UTC CI runners, rather than only on some.
module.exports = () => {
	process.env.TZ = "America/Los_Angeles";
};
