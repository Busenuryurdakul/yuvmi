package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// ObjectStorage stores and retrieves binary objects (S3-compatible abstraction).
type ObjectStorage interface {
	Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error
	Open(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
	PublicURL(key string) string
}

type LocalConfig struct {
	RootDir   string
	PublicBase string // e.g. http://localhost:8080/api/v1/files
}

type LocalStorage struct {
	root       string
	publicBase string
}

func NewLocalStorage(cfg LocalConfig) (*LocalStorage, error) {
	root := cfg.RootDir
	if root == "" {
		root = "./data/uploads"
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}
	base := strings.TrimRight(cfg.PublicBase, "/")
	return &LocalStorage{root: root, publicBase: base}, nil
}

func (s *LocalStorage) Put(_ context.Context, key string, r io.Reader, _ int64, _ string) error {
	path := s.filePath(key)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (s *LocalStorage) Open(_ context.Context, key string) (io.ReadCloser, error) {
	return os.Open(s.filePath(key))
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	return os.Remove(s.filePath(key))
}

func (s *LocalStorage) PublicURL(key string) string {
	if s.publicBase == "" {
		return "/api/v1/files/" + key
	}
	return s.publicBase + "/" + key
}

func (s *LocalStorage) filePath(key string) string {
	clean := filepath.Clean(key)
	clean = strings.TrimPrefix(clean, string(os.PathSeparator))
	return filepath.Join(s.root, clean)
}

func NewFromEnv(publicBase string) (ObjectStorage, error) {
	backend := strings.ToLower(os.Getenv("STORAGE_BACKEND"))
	if backend == "" || backend == "local" {
		root := os.Getenv("STORAGE_LOCAL_PATH")
		return NewLocalStorage(LocalConfig{RootDir: root, PublicBase: publicBase})
	}
	if backend == "s3" {
		return NewS3Storage(S3Config{
			Endpoint:  os.Getenv("S3_ENDPOINT"),
			Bucket:    os.Getenv("S3_BUCKET"),
			AccessKey: os.Getenv("S3_ACCESS_KEY"),
			SecretKey: os.Getenv("S3_SECRET_KEY"),
			Region:    os.Getenv("S3_REGION"),
			UseSSL:    os.Getenv("S3_USE_SSL") != "false",
			PublicBase: os.Getenv("S3_PUBLIC_BASE"),
		})
	}
	return nil, fmt.Errorf("unknown STORAGE_BACKEND: %s", backend)
}
