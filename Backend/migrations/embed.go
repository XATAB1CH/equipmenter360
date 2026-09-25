// Package migrations встраивает SQL-миграции в бинарь,
// чтобы goose применял их при старте сервера (как в Garnet).
package migrations

import "embed"

// Migrations — встроенные goose-миграции.
//
//go:embed *.sql
var Migrations embed.FS
