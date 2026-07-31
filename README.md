# tree-sitter-stylus

A native [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the [Stylus](https://stylus-lang.com/) CSS preprocessor.

The grammar parses both indentation-based and brace-based Stylus directly. It is not a CSS grammar fallback, so Stylus-specific selectors, expressions, mixins, control flow, interpolation, and indentation are represented in the syntax tree.

> Pre-release: the grammar is ready for editor integration and development testing. Language bindings and package registry releases are planned but are not included yet.

## Syntax Coverage

- Indentation-based and brace-based blocks, including braces placed on the next line
- Tag, class, ID, universal, attribute, pseudo, parent, reference, relative, root, and namespace selectors
- Selector and property interpolation
- Declarations, custom properties, variables, assignments, member access, and subscripts
- Mixin definitions, function calls, named arguments, rest parameters, anonymous functions, block capture, and block calls
- `if`, `unless`, `else`, `for`, `return`, postfix conditions, and postfix comprehensions
- Generic at-rules, media features, `@extend`, and vendor-prefixed keyframes
- Binary, unary, range, ternary, and parenthesized expressions
- Colors, numbers and units, strings, URLs, Unicode ranges, hashes, booleans, and null values
- Line and block comments

See [`example.styl`](example.styl) for a broad syntax fixture and [`test/corpus/statements.txt`](test/corpus/statements.txt) for asserted parse trees.

## Compatibility

The current parser has been checked with:

- 21 focused Tree-sitter corpus tests, all passing
- The full [`example.styl`](example.styl) fixture, parsed without `ERROR` or `MISSING` nodes; the fixture also compiles cleanly with the official Stylus compiler
- Query compilation for highlights, brackets, indentation, and text objects
- A reproducible sweep of 499 non-empty `.styl` files from the official [Stylus](https://github.com/stylus/stylus) repository (pinned to the `0.64.0` tag) and [nib](https://github.com/stylus/nib) (pinned to `v1.2.0`), parsed without `ERROR` or `MISSING` nodes — run it yourself with `npm run sweep` (revisions are overridable via `SWEEP_STYLUS_REF` / `SWEEP_NIB_REF`)

CI regenerates the parser, runs the corpus suite, parses the fixtures, compiles all queries, and runs the pinned 499-file sweep on every push.

These checks measure parser compatibility, not compiler equivalence. The official Stylus compiler remains the source of truth for semantic validity.

## Usage

### Zed

This grammar powers [stylus-zed](https://github.com/sf-yuzifu/stylus-zed). A Zed extension can pin it in `extension.toml`:

```toml
[grammars.stylus]
repository = "https://github.com/sf-yuzifu/tree-sitter-stylus"
rev = "<full-commit-sha>"
```

Always pin a full commit SHA so generated parser nodes and editor queries remain reproducible.

### Source Checkout

The repository includes generated C parser sources and an external indentation scanner. Clone it and install the development dependency to use the Tree-sitter CLI:

```sh
git clone https://github.com/sf-yuzifu/tree-sitter-stylus.git
cd tree-sitter-stylus
npm install
npx tree-sitter parse example.styl
```

Node.js, Rust, Python, Go, Swift, and other language bindings are not provided yet. Until bindings are added, downstream integrations should build the generated C sources or consume the repository through an editor's grammar build system.

## Queries

Reusable editor queries are maintained in [`queries/`](queries/):

| File | Purpose |
| --- | --- |
| `highlights.scm` | Syntax highlighting |
| `brackets.scm` | Bracket matching |
| `indents.scm` | Block indentation |
| `textobjects.scm` | Function-, class-, and comment-like text objects |

Editor-specific queries can live in downstream integrations. For example, stylus-zed additionally maintains outline and syntax-override queries.

## Development

Requirements:

- Node.js 22 or a compatible current Node.js release
- npm
- The Tree-sitter CLI installed through this repository's development dependencies
- A C compiler when building the generated parser locally

Install dependencies and run the parser checks:

```sh
npm install
npx tree-sitter generate
npx tree-sitter test
npx tree-sitter parse --quiet --stat example.styl
```

Compile each query against the fixture:

```sh
for query in queries/*.scm; do
  npx tree-sitter query "$query" example.styl >/dev/null
done
```

After changing `grammar.js` or `src/scanner.c`, regenerate the checked-in parser sources and include them in the same commit:

```sh
npx tree-sitter generate
git diff -- src/grammar.json src/node-types.json src/parser.c
```

New syntax should normally include a minimal corpus case with an asserted tree. Broad real-world examples can also be added to `example.styl`, but the fixture does not replace corpus coverage.

## Repository Layout

```text
tree-sitter-stylus/
├── grammar.js
├── tree-sitter.json
├── src/
│   ├── scanner.c
│   ├── parser.c
│   ├── grammar.json
│   └── node-types.json
├── queries/
│   ├── highlights.scm
│   ├── brackets.scm
│   ├── indents.scm
│   └── textobjects.scm
├── test/corpus/statements.txt
└── example.styl
```

## Known Limitations

- Pseudo-class and pseudo-element argument contents are currently represented by permissive `pseudo_argument_text` nodes. Nested argument contents therefore do not yet expose a fully structured syntax tree.
- The grammar intentionally accepts some ambiguous or incomplete input to remain useful during editing. It does not replace the Stylus compiler or a linter.
- Some constructs covered by `example.styl` are smoke-tested but do not yet have dedicated corpus assertions.
- Language bindings and npm/crates.io/PyPI-style package releases are not available yet.

## Roadmap

- Convert the remaining advanced fixture constructs into focused corpus tests
- Parse common pseudo-selector arguments structurally without rejecting arbitrary CSS syntax
- Add standard Tree-sitter language bindings and package releases
- Add fuzz, incremental-edit, and parser performance coverage

## Contributing

Issues and pull requests are welcome. Parser bug reports should include:

- A minimal `.styl` sample
- The unexpected syntax tree or `ERROR`/`MISSING` node
- The expected Stylus compiler behavior when relevant

Run `npx tree-sitter test` and parse `example.styl` before submitting grammar changes. Zed-specific integration issues should be reported in [stylus-zed](https://github.com/sf-yuzifu/stylus-zed).

## Acknowledgements

This grammar builds on and is grateful to the following projects:

- [Stylus](https://github.com/stylus/stylus) — the language, reference compiler, documentation, and the compatibility fixtures used to validate this grammar.
- [nib](https://github.com/stylus/nib) — real-world Stylus sources for compatibility sweeps.
- [Tree-sitter](https://github.com/tree-sitter/tree-sitter) — the incremental parsing infrastructure and CLI this grammar is built with.
- [tree-sitter-less](https://github.com/jimliang/tree-sitter-less) — a useful reference for external-scanner and indentation handling patterns.
- [Zed](https://github.com/zed-industries/zed) — the downstream editor platform this grammar targets through [stylus-zed](https://github.com/sf-yuzifu/stylus-zed).

## License

[MIT](LICENSE)
