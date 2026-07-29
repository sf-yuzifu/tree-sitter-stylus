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

  externals: $ => [$._newline, $._indent, $._dedent],

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
    [$.argument_list, $._values],
    [$.call_statement],
    [$.declaration],
    [$.variable_declaration],
    [$.return_statement],
    [$.number_value],
    [$.parenthesized_expression],
    [$._simple_selector, $.declaration],
  ],

  rules: {
    source_file: $ => repeat(choice($._statement, $._newline)),

    _statement: $ => choice(
      $.rule_set,
      $.at_rule,
      $.variable_declaration,
      $.declaration,
      $.call_statement,
      $.mixin_definition,
      $.if_statement,
      $.for_statement,
      $.return_statement,
    ),

    comment: $ => choice(
      seq('//', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    ),

    // ---------- selectors ----------
    rule_set: $ => seq($.selector_list, $.block),

    selector_list: $ => seq($._selector, repeat(seq(',', $._selector))),

    _selector: $ => repeat1(choice($._simple_selector, $.combinator)),

    combinator: $ => choice('>', '+', '~'),

    _simple_selector: $ => choice(
      $.class_selector,
      $.id_selector,
      $.universal_selector,
      $.attribute_selector,
      $.pseudo_class_selector,
      $.pseudo_element_selector,
      $.parent_selector,
      alias($.interpolated_name, $.tag_name),
      alias($.identifier, $.tag_name),
    ),

    class_selector: $ => seq('.', choice(
      alias($.identifier, $.class_name),
      alias($.interpolated_name, $.class_name),
    )),
    id_selector: $ => seq('#', choice(
      alias($.identifier, $.id_name),
      alias($.interpolated_name, $.id_name),
    )),
    universal_selector: $ => '*',
    parent_selector: $ => '&',
    attribute_selector: $ => seq(
      '[',
      alias($.identifier, $.attribute_name),
      optional(seq(
        choice('=', '~=', '^=', '$=', '*=', '|='),
        choice($.identifier, $.string_value),
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
    pseudo_arguments: $ => seq('(', /[^)]*/, ')'),

    // ---------- blocks ----------
    block: $ => choice(
      seq('{', repeat(choice($._statement, $._newline)), '}'),
      seq($._indent, repeat(choice($._statement, $._newline)), $._dedent),
    ),

    // ---------- declarations ----------
    declaration: $ => seq(
      field('property', choice(
        alias($.identifier, $.property_name),
        alias($.interpolated_name, $.property_name),
      )),
      optional(choice(':', token.immediate(':'))),
      $._values,
      optional($._terminator),
    ),

    variable_declaration: $ => seq(
      field('name', choice($.variable, alias($.identifier, $.variable_name))),
      '=',
      $._values,
      optional($._terminator),
    ),

    _terminator: $ => choice(';', $._newline),

    // ---------- calls / mixins ----------
    call_statement: $ => seq(
      field('function', $.identifier),
      optional(choice($.argument_list, $._values)),
      optional($._terminator),
    ),

    mixin_definition: $ => seq(
      field('name', $.identifier),
      $.parameter_list,
      $.block,
    ),

    parameter_list: $ => seq('(', commaSep($.parameter), ')'),

    parameter: $ => seq(
      choice($.variable, $.identifier),
      optional(seq('=', $._value)),
    ),

    argument_list: $ => seq('(', commaSep($._value), ')'),

    call_expression: $ => prec(PREC.call, seq(
      field('function', choice($.variable, $.identifier)),
      $.argument_list,
    )),

    // ---------- at-rules ----------
    at_rule: $ => choice(
      $.keyframes_statement,
      $.generic_at_rule,
    ),

    generic_at_rule: $ => seq(
      $.at_keyword,
      repeat($._at_param),
      choice($.block, $._terminator),
    ),

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
      ',',
      'and', 'or', 'not', 'only',
    ),

    media_feature: $ => seq(
      '(',
      field('property', alias($.identifier, $.property_name)),
      choice(':', token.immediate(':')),
      $._values,
      ')',
    ),

    keyframes_statement: $ => seq(
      alias($.at_keyword_keyframes, $.at_keyword),
      field('name', $.identifier),
      $.keyframes_block,
    ),

    at_keyword_keyframes: $ => token(prec(1, choice(
      '@keyframes',
      '@-webkit-keyframes',
      '@-moz-keyframes',
      '@-o-keyframes',
    ))),

    keyframes_block: $ => choice(
      seq('{', repeat(choice($.keyframe_rule, $._newline)), '}'),
      seq($._indent, repeat(choice($.keyframe_rule, $._newline)), $._dedent),
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
      field('value', $.identifier),
      optional(seq(',', field('key', $.identifier))),
      'in',
      $._values,
      $.block,
    ),

    return_statement: $ => choice(
      seq('return', $._values, optional($._terminator)),
      seq('return', $._terminator),
    ),

    // ---------- values ----------
    _values: $ => seq($._value, repeat(seq(optional(','), $._value))),

    _value: $ => choice(
      $.binary_expression,
      $.unary_expression,
      $.range_expression,
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
      $.important,
      $.url_value,
    ),

    binary_expression: $ => choice(
      ...[
        ['or', PREC.or],
        ['and', PREC.and],
        ['==', PREC.equality], ['!=', PREC.equality],
        ['is', PREC.equality], ['isnt', PREC.equality],
        ['<', PREC.relational], ['<=', PREC.relational],
        ['>', PREC.relational], ['>=', PREC.relational],
        ['+', PREC.additive], ['-', PREC.additive],
        ['*', PREC.multiplicative], ['/', PREC.multiplicative], ['%', PREC.multiplicative],
      ].map(([operator, precedence]) => prec.left(precedence, seq($._value, operator, $._value))),
    ),

    unary_expression: $ => prec(PREC.unary, seq(choice('-', '+', 'not'), $._value)),

    range_expression: $ => prec.left(PREC.additive, seq($._value, choice('..', '...'), $._value)),

    parenthesized_expression: $ => seq('(', $._values, ')', optional($.unit)),

    interpolation: $ => seq('{', $._value, '}'),

    interpolated_name: $ => token(seq(
      /[-_a-zA-Z0-9]*/,
      /\{[-_a-zA-Z0-9$]+\}/,
      /[-_a-zA-Z0-9{}$]*/,
    )),

    important: $ => token('!important'),

    url_value: $ => token(prec(1, seq('url', '(', /[^)]*/, ')'))),

    color_value: $ => token(prec(1, /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})/)),

    number_value: $ => seq($.number, optional($.unit)),

    number: $ => token(/([0-9]+(\.[0-9]+)?|\.[0-9]+)/),

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

    identifier: $ => /-?[_a-zA-Z][-_a-zA-Z0-9]*/,
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
