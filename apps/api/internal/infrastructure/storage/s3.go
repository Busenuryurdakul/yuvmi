package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type S3Config struct {
	Endpoint   string
	Bucket     string
	AccessKey  string
	SecretKey  string
	Region     string
	UseSSL     bool
	PublicBase string // optional CDN/base URL; falls back to presigned-style path
}

type S3Storage struct {
	client     *minio.Client
	bucket     string
	publicBase string
}

func NewS3Storage(cfg S3Config) (*S3Storage, error) {
	if cfg.Endpoint == "" || cfg.Bucket == "" || cfg.AccessKey == "" || cfg.SecretKey == "" {
		return nil, fmt.Errorf("S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY required")
	}
	endpoint := cfg.Endpoint
	secure := cfg.UseSSL
	if strings.HasPrefix(endpoint, "http://") {
		secure = false
		u, _ := url.Parse(endpoint)
		endpoint = u.Host
	} else if strings.HasPrefix(endpoint, "https://") {
		secure = true
		u, _ := url.Parse(endpoint)
		endpoint = u.Host
	}
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: secure,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, err
	}
	return &S3Storage{client: client, bucket: cfg.Bucket, publicBase: strings.TrimRight(cfg.PublicBase, "/")}, nil
}

func (s *S3Storage) Put(ctx context.Context, key string, r io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{ContentType: contentType})
	return err
}

func (s *S3Storage) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	return obj, nil
}

func (s *S3Storage) Delete(ctx context.Context, key string) error {
	return s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
}

func (s *S3Storage) PublicURL(key string) string {
	if s.publicBase != "" {
		return s.publicBase + "/" + key
	}
	return fmt.Sprintf("/api/v1/files/%s", key)
}
