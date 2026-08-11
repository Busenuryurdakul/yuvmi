CI workflow, CODEOWNERS ve COLLABORATION.md güncellemeleri — review edilebilir yeşil PR kültürü.

## Özet

- GitHub Actions `quality` workflow: typecheck, lint, build
- CODEOWNERS: @ayse-solmaz eklendi
- COLLABORATION.md: gerçek isimler, branch protection, `quality` status check
- Web typecheck fix'leri (layout, LabScene3D, ManifestoExperienceLab)

## Değişiklik türü

- [ ] feat — yeni özellik
- [ ] fix — hata düzeltme
- [x] docs — dokümantasyon
- [x] chore — araç / bağımlılık / CI
- [ ] refactor — davranış değişmeden kod düzenleme

## Etkilenen alanlar

- [x] `apps/web`
- [ ] `apps/mobile`
- [ ] `packages/shared`
- [ ] `apps/api` (Go)
- [x] `docs/`

## Test planı

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

## Notlar

- Branch protection için `quality` status check zorunlu hale getirildi

## Checklist

- [x] Branch adı `chore/ayse-repo-hygiene` formatında
- [x] Commit mesajları anlamlı
- [x] Secret / `.env` commit'lenmedi
