const PREC = {
  or: 1,
  and: 2,
  equality: 3,
  relational: 4,
  additive: 5,
  multiplicative: 6,
  unary: 7,
  call: 8,
};

module.exports = grammar({
  name: 'stylus',

  word: $ => $.identifier,

  extras: $ => [/[^\S\n]/, $.comment],

  externals: $ => [$._newline, $._indent, $._dedent, $._brace_newline],

  conflicts: $ => [
    [$.declaration, $.call_statement],
    [$._simple_selector, $.call_statement],
    [$._simple_selector, $.declaration, $.call_statement],
    [$._values],
    [$._simple_selector, $.call_statement, $._value],
    [$._simple_selector, $.declaration, $.call_statement, $._value],
    [$.call_statement, $._value],
    [$.declaration, $.call_statement, $._value],
    [$.parameter, $._value],
    [$.call_statement],
    [$.declaration],
    [$.variable_declaration],
    [$.return_statement],
    [$.number_value],
    [$.parenthesized_expression],
    [$.generic_at_rule, $._value],
    [$.universal_selector, $.declaration],
    [$.declaration, $._value],
    [$._argument, $._value],
    [$.parameter_list, $.argument_list],
    [$._simple_selector, $._value],
    [$.selector_list],
    [$.expression_statement],
    [$._simple_selector, $.declaration, $._value],
    [$.pseudo_class_selector],
    [$.pseudo_element_selector],
    [$._values, $.interpolation],
    [$.expression_statement, $.expression_block],
    [$.assignment_expression, $._values],
    [$.assignment_expression, $.parameter],
    [$.postfix_comprehension],
    [$._keyframe_selector, $._value],
    [$.ternary_expression, $._values],
    [$.at_pseudo_selector],
    [$.id_selector, $.color_value],
    [$.root_reference],
  ],

  rules: {
    source_file: $ => repeat(choice($._statement, $._newline)),

    _statement: $ => choice(
      $.rule_set,
      $.at_rule,
      $.variable_declaration,
      $.declaration,
      $.call_statement,
      $.block_call_statement,
      $.mixin_definition,
      $.if_statement,
      $.for_statement,
      $.return_statement,
      $.expression_statement,
    ),

    comment: $ => choice(
      seq('//', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    ),

    // ---------- selectors ----------
    rule_set: $ => prec.dynamic(2, seq($.selector_list, $.block)),

    selector_list: $ => seq(
      $._selector,
      repeat(choice(
        seq(',', optional($._newline), $._selector),
        seq($._newline, $._selector),
      )),
    ),

    _selector: $ => repeat1(choice($._simple_selector, $.combinator)),

    combinator: $ => choice('>', '+', '~'),

    _simple_selector: $ => choice(
      $.class_selector,
      $.id_selector,
      $.universal_selector,
      $.attribute_selector,
      $.pseudo_class_selector,
      $.pseudo_element_selector,
      $.pseudo_interpolation_selector,
      $.at_pseudo_selector,
      $.reference_selector,
      $.root_reference,
      $.relative_reference,
      $.namespace_selector,
      $.parent_selector,
      alias($.variable, $.tag_name),
      alias($.interpolation, $.tag_name),
      alias($.interpolated_name, $.tag_name),
      alias($.identifier, $.tag_name),
    ),

    class_selector: $ => seq('.', choice(
      alias($.identifier, $.class_name),
      alias($.interpolated_name, $.class_name),
    )),
    id_selector: $ => seq('#', choice(
      alias($._hash_value, $.id_name),
      alias($.interpolated_name, $.id_name),
    )),
    universal_selector: $ => '*',
    parent_selector: $ => seq('&', optional($.parent_suffix)),
    parent_suffix: $ => token.immediate(/-[0-9][-_a-zA-Z0-9]*/),
    reference_selector: $ => seq('^', '[', $._values, ']'),
    root_reference: $ => seq(
      '/',
      optional(choice(
        $.variable,
        $.class_selector,
        $.id_selector,
        seq($.interpolation, optional(alias($.identifier, $.tag_name))),
        alias($.interpolated_name, $.tag_name),
        alias($.identifier, $.tag_name),
      )),
    ),
    relative_reference: $ => seq(
      repeat1('../'),
      choice(
        $.class_selector,
        $.id_selector,
        alias($.interpolated_name, $.tag_name),
        alias($.identifier, $.tag_name),
      ),
    ),
    namespace_selector: $ => seq(
      choice(alias($.identifier, $.tag_name), '*'),
      '|',
      choice(
        $.class_selector,
        $.id_selector,
        alias($.identifier, $.tag_name),
        '*',
      ),
    ),
    attribute_selector: $ => seq(
      '[',
      choice(
        alias($.identifier, $.attribute_name),
        $.string_value,
      ),
      optional(seq(
        choice('=', '~=', '^=', '$=', '*=', '|='),
        choice($.identifier, $.string_value, $.variable),
      )),
      ']',
    ),
    pseudo_class_selector: $ => prec(1, seq(
      token.immediate(':'),
      alias(token.immediate(/[-_a-zA-Z][-_a-zA-Z0-9]*/), $.pseudo_class_name),
      optional($.pseudo_arguments),
    )),
    pseudo_element_selector: $ => prec(1, seq(
      token.immediate('::'),
      alias(token.immediate(/[-_a-zA-Z][-_a-zA-Z0-9]*/), $.pseudo_element_name),
      optional($.pseudo_arguments),
    )),
    pseudo_interpolation_selector: $ => seq(
      token.immediate(':'),
      $.interpolation,
    ),
    pseudo_arguments: $ => seq(
      '(',
      repeat(choice($.pseudo_arguments, $.pseudo_argument_text)),
      ')',
    ),
    pseudo_argument_text: $ => token(prec(-1, /[^()]+/)),

    // ---------- blocks ----------
    block: $ => choice(
      seq('{', repeat(choice($._statement, $._newline)), '}'),
      seq($._brace_newline, '{', repeat(choice($._statement, $._newline)), '}'),
      $._indented_block,
    ),

    _indented_block: $ => seq(
      $._indent,
      repeat(choice($._statement, $._newline)),
      $._dedent,
    ),

    // ---------- declarations ----------
    declaration: $ => prec.dynamic(1, seq(
      optional('*'),
      field('property', choice(
        alias($.identifier, $.property_name),
        alias($.interpolated_name, $.property_name),
        alias($.interpolation, $.property_name),
      )),
      choice(
        seq(
          optional(choice(':', token.immediate(':'))),
          $._values,
          repeat(choice($.postfix_condition, $.postfix_comprehension)),
          optional($._terminator),
        ),
        seq(
          choice(':', token.immediate(':')),
          $._indent,
          $._values,
          optional(choice(',', ';')),
          $._dedent,
          optional($._terminator),
        ),
      ),
    )),

    postfix_condition: $ => seq(choice('if', 'unless'), $._values),

    postfix_comprehension: $ => seq(
      'for',
      choice($.identifier, $.variable),
      optional(seq(',', choice($.identifier, $.variable))),
      'in',
      $._values,
      optional($.postfix_condition),
    ),

    variable_declaration: $ => seq(
      field('name', choice(
        $.variable,
        alias($.identifier, $.variable_name),
        $.subscript_expression,
        $.member_expression,
      )),
      choice('=', '?=', ':=', '+=', '-=', '*=', '/=', '%='),
      choice($._values, $.block_capture, $._indented_block),
      repeat(choice($.postfix_condition, $.postfix_comprehension)),
      optional($._terminator),
    ),

    block_capture: $ => seq(
      alias('@block', $.at_keyword),
      $.block,
    ),

    _terminator: $ => choice(';', $._newline),

    expression_statement: $ => prec.dynamic(-1, seq(
      $._values,
      repeat(choice($.postfix_condition, $.postfix_comprehension)),
      optional($._terminator),
    )),

    ternary_expression: $ => prec.right(seq(
      $._value,
      '?',
      $._values,
      ':',
      $._values,
    )),

    assignment_expression: $ => prec.right(seq(
      field('name', choice(
        $.variable,
        alias($.identifier, $.variable_name),
        $.subscript_expression,
        $.member_expression,
      )),
      choice('=', '?=', ':=', '+=', '-=', '*=', '/=', '%='),
      $._value,
    )),

    // ---------- calls / mixins ----------
    call_statement: $ => seq(
      field('function', choice($.identifier, $.interpolated_name)),
      optional(choice($.argument_list, $._values)),
      optional($.postfix_condition),
      optional($._terminator),
    ),

    block_call_statement: $ => prec.dynamic(4, seq(
      field('function', alias($.block_call_name, $.identifier)),
      optional($.argument_list),
      $.block,
    )),

    block_call_name: $ => token(seq('+', /-{0,2}[_a-zA-Z][-_a-zA-Z0-9]*/)),

    mixin_definition: $ => prec.dynamic(3, seq(
      field('name', $.identifier),
      $.parameter_list,
      $.block,
    )),

    parameter_list: $ => seq(
      token.immediate('('),
      optional($._newline),
      commaSepNL($, $.parameter),
      optional(','),
      optional($._newline),
      ')',
    ),

    parameter: $ => seq(
      choice($.variable, $.identifier),
      optional(seq('=', $._value)),
      optional('...'),
    ),

    argument_list: $ => seq(
      token.immediate('('),
      optional($._newline),
      commaSepNL($, $._argument),
      optional(','),
      optional($._newline),
      ')',
    ),

    _argument: $ => choice(
      seq($._value, repeat($._value), optional('...')),
      $.named_argument,
      $.anonymous_function,
      $.block_capture,
    ),

    named_argument: $ => seq(
      alias($.identifier, $.property_name),
      ':',
      seq($._value, repeat($._value)),
    ),

    call_expression: $ => prec(PREC.call, seq(
      field('function', choice($.variable, $.identifier)),
      $.argument_list,
    )),

    // ---------- at-rules ----------
    at_rule: $ => choice(
      $.keyframes_statement,
      $.extend_statement,
      $.generic_at_rule,
    ),

    generic_at_rule: $ => prec.dynamic(3, seq(
      $.at_keyword,
      repeat($._at_param),
      choice($.block, $._terminator),
    )),

    extend_statement: $ => prec.right(seq(
      alias(choice('@extend', '@extends'), $.at_keyword),
      repeat1($._at_param),
      optional($._terminator),
    )),

    at_keyword: $ => token(seq('@', /[-_a-zA-Z][-_a-zA-Z0-9]*/)),

    _at_param: $ => choice(
      $.parenthesized_expression,
      $.call_expression,
      $.variable,
      $.color_value,
      $.number_value,
      $.string_value,
      $.boolean_value,
      $.null_value,
      $.identifier,
      $.interpolation,
      $.url_value,
      $.media_feature,
      $.class_selector,
      $.id_selector,
      $.attribute_selector,
      $.universal_selector,
      $.pseudo_class_selector,
      $.pseudo_element_selector,
      $.at_pseudo_selector,
      $.optional_flag,
      ',',
      'and', 'or', 'not', 'only', '&&', '||',
    ),

    optional_flag: $ => token('!optional'),

    at_pseudo_selector: $ => seq(
      ':',
      alias($.identifier, $.pseudo_class_name),
      optional($.pseudo_arguments),
    ),

    media_feature: $ => seq(
      '(',
      field('property', choice(
        alias($.identifier, $.property_name),
        alias($.variable, $.property_name),
        alias($.interpolation, $.property_name),
      )),
      choice(':', token.immediate(':')),
      $._values,
      ')',
    ),

    keyframes_statement: $ => seq(
      alias($.at_keyword_keyframes, $.at_keyword),
      field('name', choice($.identifier, $.interpolation, $.interpolated_name)),
      $.keyframes_block,
    ),

    at_keyword_keyframes: $ => token(prec(1, choice(
      '@keyframes',
      '@-webkit-keyframes',
      '@-moz-keyframes',
      '@-o-keyframes',
    ))),

    keyframes_block: $ => choice(
      seq('{', repeat(choice($.keyframe_rule, $._statement, $._newline)), '}'),
      seq(
        $._brace_newline,
        '{',
        repeat(choice($.keyframe_rule, $._statement, $._newline)),
        '}',
      ),
      seq($._indent, repeat(choice($.keyframe_rule, $._statement, $._newline)), $._dedent),
    ),

    keyframe_rule: $ => seq(
      $._keyframe_selector,
      repeat(seq(',', $._keyframe_selector)),
      $.block,
    ),

    _keyframe_selector: $ => choice('from', 'to', $.number_value),

    // ---------- control flow ----------
    if_statement: $ => seq(
      choice('if', 'unless'),
      field('condition', $._values),
      $.block,
      repeat($.else_if_clause),
      optional($.else_clause),
    ),

    else_if_clause: $ => seq(
      'else',
      choice('if', 'unless'),
      field('condition', $._values),
      $.block,
    ),

    else_clause: $ => seq('else', $.block),

    for_statement: $ => seq(
      'for',
      field('value', choice($.identifier, $.variable)),
      optional(seq(',', field('key', choice($.identifier, $.variable)))),
      'in',
      $._values,
      $.block,
    ),

    return_statement: $ => choice(
      seq(
        'return',
        $._values,
        repeat(choice($.postfix_condition, $.postfix_comprehension)),
        optional($._terminator),
      ),
      seq('return', $._terminator),
    ),

    // ---------- values ----------
    _values: $ => seq(
      $._value,
      repeat(choice(
        seq(optional($._newline), ',', optional($._newline), $._value),
        $._value,
      )),
    ),

    _value: $ => choice(
      $.assignment_expression,
      $.binary_expression,
      $.unary_expression,
      $.ternary_expression,
      $.range_expression,
      $.subscript_expression,
      $.member_expression,
      $.parenthesized_expression,
      $.media_feature,
      $.call_expression,
      $.anonymous_function,
      $.variable,
      $.color_value,
      $.number_value,
      $.string_value,
      $.boolean_value,
      $.null_value,
      $.identifier,
      $.interpolation,
      $.hash_literal,
      $.at_keyword,
      $.important,
      $.url_value,
      $.unicode_range,
      $.escape_sequence,
    ),

    subscript_expression: $ => prec.left(PREC.call, seq(
      $._value,
      '[',
      optional($._values),
      ']',
    )),

    member_expression: $ => prec.left(PREC.call, seq(
      $._value,
      '.',
      alias($.identifier, $.property_name),
    )),

    anonymous_function: $ => seq('@', $.parameter_list, $.expression_block),

    expression_block: $ => choice(
      seq('{', repeat(choice($._statement, $._values, $._newline)), '}'),
      seq(
        $._brace_newline,
        '{',
        repeat(choice($._statement, $._values, $._newline)),
        '}',
      ),
      seq($._indent, repeat(choice($._statement, $._values, $._newline)), $._dedent),
    ),

    unicode_range: $ => token(/[uU]\+[0-9a-fA-F?]{1,6}(-[0-9a-fA-F?]{1,6})?/),

    escape_sequence: $ => token(/\\(.|\n)/),

    hash_literal: $ => seq(
      '{',
      optional($._newline),
      optional(seq(
        $.hash_pair,
        repeat(choice(
          seq(optional($._newline), ',', optional($._newline), $.hash_pair),
          seq($._newline, $.hash_pair),
        )),
        optional(','),
      )),
      optional($._newline),
      '}',
    ),

    hash_pair: $ => seq(
      choice(
        alias($.identifier, $.property_name),
        alias($.interpolated_name, $.property_name),
        $.string_value,
        $.variable,
      ),
      ':',
      seq($._value, repeat($._value)),
    ),

    binary_expression: $ => choice(
      prec.left(PREC.equality, seq($._value, 'is', 'a', $._value)),
      prec.right(PREC.multiplicative, seq($._value, '**', $._value)),
      ...[
        ['or', PREC.or], ['||', PREC.or],
        ['and', PREC.and], ['&&', PREC.and],
        ['==', PREC.equality], ['!=', PREC.equality],
        ['is', PREC.equality], ['isnt', PREC.equality], ['in', PREC.equality],
        ['<', PREC.relational], ['<=', PREC.relational],
        ['>', PREC.relational], ['>=', PREC.relational],
        ['+', PREC.additive], ['-', PREC.additive],
        ['*', PREC.multiplicative], ['/', PREC.multiplicative], ['%', PREC.multiplicative],
      ].map(([operator, precedence]) => prec.left(precedence, seq($._value, operator, $._value))),
    ),

    unary_expression: $ => prec(PREC.unary, seq(choice('-', '+', 'not', '!', '~'), $._value)),

    range_expression: $ => prec.left(PREC.additive, seq($._value, choice('..', '...'), $._value)),

    parenthesized_expression: $ => seq('(', optional($._values), ')', optional($.unit)),

    interpolation: $ => seq('{', $._value, '}'),

    interpolated_name: $ => token(seq(
      /[-_a-zA-Z0-9$]*/,
      /\{[-_a-zA-Z0-9$]+\}/,
      /[-_a-zA-Z0-9{}$]*/,
    )),

    important: $ => token('!important'),

    url_value: $ => token(prec(1, seq('url', '(', /[^)]*/, ')'))),

    color_value: $ => seq('#', $._hash_value),

    _hash_value: $ => token(/[-_a-zA-Z0-9]+/),

    number_value: $ => seq($.number, optional($.unit)),

    number: $ => token(/([0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?|\.[0-9]+([eE][-+]?[0-9]+)?)/),

    unit: $ => choice(
      '%', 'px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax',
      's', 'ms', 'deg', 'grad', 'rad', 'turn', 'fr',
      'ch', 'ex', 'cm', 'mm', 'in', 'pt', 'pc', 'q',
      'dpi', 'dpcm', 'dppx', 'Hz', 'kHz',
    ),

    string_value: $ => choice(
      token(seq('"', repeat(choice(/[^"\\]/, /\\./)), '"')),
      token(seq("'", repeat(choice(/[^'\\]/, /\\./)), "'")),
    ),

    boolean_value: $ => choice('true', 'false'),

    null_value: $ => 'null',

    variable: $ => token(seq('$', /[-_a-zA-Z][-_a-zA-Z0-9]*/)),

    identifier: $ => /-{0,2}[_a-zA-Z]([-_a-zA-Z0-9]|\\.)*/,
  },
});

function commaSepNL($, rule) {
  return optional(commaSep1NL($, rule));
}

function commaSep1NL($, rule) {
  return seq(
    rule,
    repeat(seq(optional($._newline), ',', optional($._newline), rule)),
  );
}
