globalThis.process ??= {}; globalThis.process.env ??= {};
const me = new Proxy({"src":"/_astro/matt.BiZROmcN.jpeg","width":2977,"height":2977,"format":"jpg","orientation":1}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "/Users/matt/dev/mmattbtw/website/src/assets/matt.jpeg";
							}
							
							return target[name];
						}
					});

export { me as m };
