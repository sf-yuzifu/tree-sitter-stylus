# tree-sitter-stylus

[English](README.md)

为 [Stylus](https://stylus-lang.com/) CSS 预处理器实现的原生 [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar。

该 grammar 直接解析缩进式和大括号式 Stylus，而不是用 CSS grammar 代替。因此 Stylus 特有的选择器、表达式、mixin、控制流、插值和缩进都会体现在语法树中。

> 预发布状态：grammar 已可用于编辑器集成与开发测试。语言绑定与各包仓库的发布已列入计划，但尚未提供。

## 语法覆盖

- 缩进式与大括号式代码块，包括大括号放在下一行的写法
- 标签、类、ID、通配、属性、伪类、父引用、引用、相对、根与命名空间选择器
- 选择器与属性名插值
- 声明、自定义属性、变量、赋值、成员访问与下标访问
- mixin 定义、函数调用、命名参数、rest 参数、匿名函数、block 捕获与 block call
- `if`、`unless`、`else`、`for`、`return`、后缀条件与后缀推导
- 通用 at-rule、媒体查询特性、`@extend` 与带厂商前缀的 keyframes
- 二元、一元、范围、三元与括号表达式
- 颜色、数字与单位、字符串、URL、unicode-range、hash、布尔值与 null
- 行注释与块注释

综合语法样例见 [`example.styl`](example.styl)（其导入目标为 [`example-partials.styl`](example-partials.styl)），带断言的语法树见 [`test/corpus/statements.txt`](test/corpus/statements.txt)。

## 兼容性

当前 parser 已通过以下检查：

- 21 个聚焦的 Tree-sitter corpus 测试，全部通过
- 完整的 [`example.styl`](example.styl) fixture，解析结果中没有 `ERROR` 或 `MISSING` 节点；该 fixture 同时能被官方 Stylus 编译器无错误编译
- highlights、brackets、indents 与 text objects 查询均可编译
- 对 Stylus 官方仓库与 [nib](https://github.com/stylus/nib) 中 501 个非空 `.styl` 文件的手工扫描，未产生 `ERROR` 或 `MISSING` 节点

CI 目前会重新生成 parser 并运行 corpus 测试。完整 fixture、查询编译与真实项目扫描属于发布前检查而非 CI 任务；在扫描脚本与样例来源 revision 纳入仓库前，501 文件数据只表示一次已记录的测试结果。

这些结果衡量的是 parser 兼容性，并不等价于编译器语义。Stylus 官方编译器仍然是判断代码语义是否合法的最终依据。

## 使用

### Zed

该 grammar 为 [stylus-zed](https://github.com/sf-yuzifu/stylus-zed) 提供支持。Zed 扩展可以在 `extension.toml` 中固定它：

```toml
[grammars.stylus]
repository = "https://github.com/sf-yuzifu/tree-sitter-stylus"
rev = "<full-commit-sha>"
```

请始终固定完整的 commit SHA，以确保生成的 parser 节点与编辑器查询可复现。

### 源码检出

仓库包含已生成的 C parser 源码与外部缩进 scanner。克隆后安装开发依赖即可使用 Tree-sitter CLI：

```sh
git clone https://github.com/sf-yuzifu/tree-sitter-stylus.git
cd tree-sitter-stylus
npm install
npx tree-sitter parse example.styl
```

尚未提供 Node.js、Rust、Python、Go、Swift 等语言绑定。在补充绑定之前，下游集成应编译仓库中的 C 源码，或通过编辑器的 grammar 构建系统使用本仓库。

## 查询

可复用的编辑器查询维护在 [`queries/`](queries/)：

| 文件 | 用途 |
| --- | --- |
| `highlights.scm` | 语法高亮 |
| `brackets.scm` | 括号匹配 |
| `indents.scm` | 代码块缩进 |
| `textobjects.scm` | 函数、类与注释粒度的 text objects |

编辑器专用查询可以放在下游集成中。例如 stylus-zed 另外维护了 outline 与 syntax override 查询。

## 开发

依赖：

- Node.js 22 或兼容的 current 版本
- npm
- 通过本仓库开发依赖安装的 Tree-sitter CLI
- 本地构建生成的 parser 时需要的 C 编译器

安装依赖并运行 parser 检查：

```sh
npm install
npx tree-sitter generate
npx tree-sitter test
npx tree-sitter parse --quiet --stat example.styl
```

针对 fixture 编译每个查询：

```sh
for query in queries/*.scm; do
  npx tree-sitter query "$query" example.styl >/dev/null
done
```

修改 `grammar.js` 或 `src/scanner.c` 后，重新生成纳入版本控制的 parser 源码，并在同一次提交中包含它们：

```sh
npx tree-sitter generate
git diff -- src/grammar.json src/node-types.json src/parser.c
```

新增语法通常应附带一个最小 corpus 用例和断言语法树。宽泛的真实示例也可以加入 `example.styl`，但 fixture 不能替代 corpus 覆盖。

## 仓库结构

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
├── example.styl
└── example-partials.styl
```

## 已知限制

- 伪类与伪元素参数内容目前以宽容的 `pseudo_argument_text` 节点表示，嵌套参数尚不能获得完整结构化的语法树。
- grammar 会有意接受一些有歧义或不完整的输入，以保证编辑过程中的可用性。它不能替代 Stylus 编译器或 linter。
- `example.styl` 覆盖的部分写法有冒烟测试，但还没有专门的 corpus 断言。
- 尚未提供语言绑定和 npm/crates.io/PyPI 等包仓库发布。
- CI 尚未运行完整 fixture、查询编译或真实项目兼容性扫描。

## 路线图

- 将 fixture 中剩余的高级写法转换为聚焦的 corpus 测试
- 在不拒绝任意 CSS 语法的前提下，结构化解析常见伪选择器参数
- 增加带固定 Stylus 与 nib revision 的可复现真实项目兼容性扫描脚本
- 在 CI 中加入查询与 fixture 检查
- 增加标准 Tree-sitter 语言绑定与包发布
- 增加 fuzz、增量编辑与 parser 性能测试

## 贡献

欢迎提交 issue 和 pull request。parser 问题报告请包含：

- 最小 `.styl` 样例
- 非预期的语法树或 `ERROR`/`MISSING` 节点
- 相关时附上 Stylus 编译器的预期行为

提交 grammar 变更前请运行 `npx tree-sitter test` 并解析 `example.styl`。Zed 集成相关问题请提交到 [stylus-zed](https://github.com/sf-yuzifu/stylus-zed)。

## 许可证

[MIT](LICENSE)
