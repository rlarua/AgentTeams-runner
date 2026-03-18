# Runner Permission Reference

## Runner별 권한 설정

| Runner | CLI | 권한 플래그 | 샌드박스 |
|---|---|---|---|
| **Claude Code** | `claude` | `--dangerously-skip-permissions` | 전체 스킵 |
| **AMP** | `ampcode` | `--dangerously-allow-all` | 전체 스킵 |
| **Codex** | `codex` | `CODEX_SANDBOX_LEVEL` 환경변수 | `workspace-write` (기본) 또는 `off` |
| **Gemini** | `gemini` | `-y` (auto-approve) | 없음 |
| **OpenCode** | `opencode` | 없음 | 없음 |

## 워크트리 설정 (`healWorktreeConfig`)

- `.agentteams` 심볼릭 링크: 원본 레포 → 워크트리
- `.env*` 파일: 원본 레포에서 워크트리로 **복사** (symlink 아님, Prisma 호환성)
- `settings.local.json`: 생성하지 않음 (`--dangerously-skip-permissions`로 불필요)

## 히스토리 및 변경 이력

### 2026-03-18: Claude Code 권한 이슈 수정

워크트리에서 Claude Code 러너 실행 시 `.agentteams` 심볼릭 링크가 샌드박스 밖으로 resolve되어 파일 읽기/쓰기/CLI 실행이 차단되던 문제.

**시도한 접근 (모두 불충분):**
1. `sandbox.filesystem.allowWrite` → 쓰기만 허용, 읽기 차단
2. `permissions.additionalDirectories` → 읽기 허용, 쓰기/bash 차단
3. `permissions.allow: ["Bash(agentteams *)"]` → CLI만 허용, 파일 쓰기 차단

**최종 해결:** `--dangerously-skip-permissions` 플래그 추가로 모든 권한 우회.

### 2026-03-18: .env 복사 방식 변경

워크트리에서 `.env` 파일을 심볼릭 링크로 공유하면 Prisma가 경로를 resolve하지 못하는 문제. `symlinkSync` → `copyFileSync`로 변경.

### 2026-03-18: fallback history JSON 파싱

stream-json 포맷의 raw JSON이 fallback history에 그대로 저장되던 버그. `extractResultTextFromStreamJson()`을 trigger-handler에서 적용하여 파싱된 텍스트만 저장.

### 2026-03-18: 워크트리 삭제 거짓 보고

`knownAuthPaths`가 비어있어 삭제 실패해도 서버에 "REMOVED"로 보고하던 버그. 실제 삭제 성공 시에만 보고하도록 수정. 근본 원인(authPath 미 persist)은 별도 플랜으로 분리.
