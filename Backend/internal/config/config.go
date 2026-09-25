// Package config загружает конфигурацию сервера из YAML-файла.
// Поддерживает подстановку переменных окружения вида ${VAR} и ${VAR:default}.
package config

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config — корневая конфигурация приложения.
type Config struct {
	Server   Server   `yaml:"server"`
	Database Database `yaml:"database"`
}

// Server — настройки HTTP-сервера.
type Server struct {
	Addr      string `yaml:"addr"`
	StaticDir string `yaml:"staticDir"`
}

// Database — настройки подключения к PostgreSQL.
type Database struct {
	Host         string `yaml:"host"`
	Port         int    `yaml:"port"`
	User         string `yaml:"user"`
	Password     string `yaml:"password"`
	DBName       string `yaml:"dbname"`
	SSLMode      string `yaml:"sslmode"`
	PoolMaxConns int32  `yaml:"poolMaxConns"`
}

// DSN возвращает строку подключения для pgx.
func (d Database) DSN() string {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s pool_max_conns=%d",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode, d.PoolMaxConns,
	)

	fmt.Println(dsn)

	return dsn
}

// envPattern — ${VAR}, ${VAR:default} или ${VAR:-default} (дефис — как в docker-compose).
var envPattern = regexp.MustCompile(`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-?([^}]*))?\}`)

// expandEnv подставляет переменные окружения в содержимое файла.
func expandEnv(data []byte) []byte {
	return envPattern.ReplaceAllFunc(data, func(match []byte) []byte {
		parts := envPattern.FindSubmatch(match)
		name := string(parts[1])
		if val, ok := os.LookupEnv(name); ok && val != "" {
			return []byte(val)
		}
		if len(parts) > 2 && parts[2] != nil {
			return parts[2] // default
		}
		return []byte{}
	})
}

// Load читает и валидирует конфигурацию из файла path.
func Load(path string) (*Config, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("прочитать конфиг %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(expandEnv(raw), &cfg); err != nil {
		return nil, fmt.Errorf("разобрать конфиг %s: %w", path, err)
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("конфиг %s: %w", path, err)
	}

	return &cfg, nil
}

// validate проверяет обязательные поля и проставляет дефолты.
func (c *Config) validate() error {
	if strings.TrimSpace(c.Server.Addr) == "" {
		c.Server.Addr = ":8080"
	}
	if strings.TrimSpace(c.Database.Host) == "" {
		return fmt.Errorf("database.host обязателен")
	}
	if c.Database.Port == 0 {
		c.Database.Port = 5432
	}
	if strings.TrimSpace(c.Database.User) == "" {
		return fmt.Errorf("database.user обязателен")
	}
	if strings.TrimSpace(c.Database.DBName) == "" {
		return fmt.Errorf("database.dbname обязателен")
	}
	if strings.TrimSpace(c.Database.SSLMode) == "" {
		c.Database.SSLMode = "disable"
	}
	if c.Database.PoolMaxConns <= 0 {
		c.Database.PoolMaxConns = 10
	}
	return nil
}
