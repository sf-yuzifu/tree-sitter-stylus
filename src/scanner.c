#include "tree_sitter/parser.h"
#include <stdlib.h>
#include <string.h>

enum TokenType {
  NEWLINE,
  INDENT,
  DEDENT,
};

typedef struct {
  uint32_t size;
  uint32_t capacity;
  uint16_t *indents;
} Scanner;

static void push_indent(Scanner *scanner, uint16_t indent) {
  if (scanner->size == scanner->capacity) {
    scanner->capacity = scanner->capacity ? scanner->capacity * 2 : 16;
    scanner->indents = realloc(scanner->indents, scanner->capacity * sizeof(uint16_t));
  }
  scanner->indents[scanner->size++] = indent;
}

static uint16_t current_indent(Scanner *scanner) {
  return scanner->indents[scanner->size - 1];
}

static void pop_indent(Scanner *scanner) {
  if (scanner->size > 1) {
    scanner->size--;
  }
}

void *tree_sitter_stylus_external_scanner_create(void) {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  push_indent(scanner, 0);
  return scanner;
}

void tree_sitter_stylus_external_scanner_destroy(void *payload) {
  Scanner *scanner = payload;
  free(scanner->indents);
  free(scanner);
}

unsigned tree_sitter_stylus_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = payload;
  uint32_t size = scanner->size;
  uint32_t max = TREE_SITTER_SERIALIZATION_BUFFER_SIZE / sizeof(uint16_t);
  if (size > max) {
    size = max;
  }
  memcpy(buffer, scanner->indents, size * sizeof(uint16_t));
  return size * sizeof(uint16_t);
}

void tree_sitter_stylus_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = payload;
  scanner->size = 0;
  if (length > 0) {
    uint32_t count = length / sizeof(uint16_t);
    for (uint32_t i = 0; i < count; i++) {
      uint16_t indent;
      memcpy(&indent, buffer + i * sizeof(uint16_t), sizeof(uint16_t));
      push_indent(scanner, indent);
    }
  }
  if (scanner->size == 0) {
    push_indent(scanner, 0);
  }
}

static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

bool tree_sitter_stylus_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = payload;

  if (lexer->eof(lexer)) {
    lexer->mark_end(lexer);
    if (valid_symbols[DEDENT] && scanner->size > 1) {
      pop_indent(scanner);
      lexer->result_symbol = DEDENT;
      return true;
    }
    return false;
  }

  bool found_end_of_line = false;
  bool end_of_file = false;
  uint32_t indent_length = 0;

  for (;;) {
    if (lexer->eof(lexer)) {
      end_of_file = true;
      break;
    }
    if (lexer->lookahead == '\n') {
      found_end_of_line = true;
      indent_length = 0;
      skip(lexer);
    } else if (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
      indent_length++;
      skip(lexer);
    } else if (lexer->lookahead == '\r' || lexer->lookahead == '\f') {
      skip(lexer);
    } else if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
          skip(lexer);
        }
      } else if (lexer->lookahead == '*') {
        advance(lexer);
        for (;;) {
          if (lexer->eof(lexer)) {
            break;
          }
          if (lexer->lookahead == '*') {
            advance(lexer);
            if (lexer->lookahead == '/') {
              advance(lexer);
              break;
            }
          } else if (lexer->lookahead == '\n') {
            found_end_of_line = true;
            indent_length = 0;
            skip(lexer);
          } else {
            skip(lexer);
          }
        }
      } else {
        return false;
      }
    } else {
      break;
    }
  }

  lexer->mark_end(lexer);

  if (end_of_file) {
    if (valid_symbols[DEDENT] && scanner->size > 1) {
      pop_indent(scanner);
      lexer->result_symbol = DEDENT;
      return true;
    }
    if (found_end_of_line && valid_symbols[NEWLINE]) {
      lexer->result_symbol = NEWLINE;
      return true;
    }
    return false;
  }

  if (found_end_of_line) {
    uint16_t current = current_indent(scanner);
    if (valid_symbols[INDENT] && indent_length > current) {
      push_indent(scanner, (uint16_t)indent_length);
      lexer->result_symbol = INDENT;
      return true;
    }
    if (valid_symbols[DEDENT] && indent_length < current) {
      pop_indent(scanner);
      lexer->result_symbol = DEDENT;
      return true;
    }
    if (valid_symbols[NEWLINE]) {
      lexer->result_symbol = NEWLINE;
      return true;
    }
    return false;
  }

  if (valid_symbols[DEDENT] && scanner->size > 1) {
    uint32_t column = lexer->get_column(lexer);
    if (column < current_indent(scanner)) {
      pop_indent(scanner);
      lexer->result_symbol = DEDENT;
      return true;
    }
  }

  return false;
}
