# AgentTeams Daemon 사용 가이드

이 문서는 `daemon/` 패키지의 실행 방법과 설정 방법을 설명합니다.

## 1. 사전 준비

- Node.js `24` 이상
- AgentTeams API 서버 실행 중
- 웹에서 발급한 데몬 토큰 (`x-daemon-token`)

## 2. 설치 및 빌드

`daemon/` 디렉터리에서 아래 명령을 실행하세요.

```bash
cd daemon
npm install
npm run build
```

## 2-1. 전역 설치

전역 명령어(`agentteams-daemon`)로 사용하려면 아래 순서로 설치하세요.

```bash
cd daemon
npm install
npm run build
npm install -g .
```

설치 확인:

```bash
agentteams-daemon --help
```

개발 중에는 전역 설치 대신 링크 방식도 사용할 수 있습니다.

```bash
cd daemon
npm run build
npm link
```

## 3. 초기 설정 (`init`)

먼저 데몬 토큰을 로컬 설정 파일에 저장해야 합니다.

```bash
cd daemon
node dist/index.js init --token <DAEMON_TOKEN> --api-url <API_URL>
```

전역 설치를 사용 중이면 아래처럼 실행할 수 있습니다.

```bash
agentteams-daemon init --token <DAEMON_TOKEN> --api-url <API_URL>
```

예시:

```bash
node dist/index.js init --token daemon_xxxxx --api-url https://api.agentteams.run
```

- `--token`은 필수입니다.
- `--api-url`은 선택입니다. 생략하면 아래 우선순위로 결정됩니다.
  - `AGENTTEAMS_API_URL` 환경변수
  - 기존 설정 파일의 `apiUrl`
  - 기본값 `https://api.agentteams.run`

초기화가 성공하면 설정 파일이 생성됩니다.

- 경로: `~/.agentteams/daemon.json`
- 저장 내용: `daemonToken`, `apiUrl`

## 4. 실행 (`start`)

```bash
cd daemon
node dist/index.js start
```

전역 설치를 사용 중이면 아래처럼 실행할 수 있습니다.

```bash
agentteams-daemon start
```

명령어를 생략해도 기본 동작은 `start`입니다.

```bash
node dist/index.js
```

## 5. 설정 우선순위

실행 시 설정은 아래 우선순위로 적용됩니다.

### 토큰

1. `AGENTTEAMS_DAEMON_TOKEN`
2. `~/.agentteams/daemon.json`의 `daemonToken`

### API URL

1. `AGENTTEAMS_API_URL`
2. `~/.agentteams/daemon.json`의 `apiUrl`
3. 기본값 `https://api.agentteams.run`

### 기타 옵션

- `POLLING_INTERVAL_MS`
  - 기본값: `30000` (30초)
- `TIMEOUT_MS`
  - 기본값: `1800000` (30분)
- `RUNNER_CMD`
  - 기본값: `opencode`
- `LOG_LEVEL`
  - 기본값: `info`
  - 값: `debug | info | warn | error`
- `DAEMON_VERBOSE_RUNNER_LOGS`
  - 기본값: `true`
  - 값: `true | false`
  - 설명: `false`면 runner stdout/stderr 상세 로그를 줄이고 시작/종료/에러 중심으로 출력
- `DAEMON_PROMPT_LOG_MODE`
  - 기본값: `preview`
  - 값: `off | length | preview | full`
  - 설명:
    - `off`: 프롬프트 로그 미출력
    - `length`: 프롬프트 길이만 출력
    - `preview`: 프롬프트 미리보기(일부) 출력
    - `full`: 프롬프트 전체 출력

예시:

```bash
AGENTTEAMS_DAEMON_TOKEN=daemon_xxxxx \
AGENTTEAMS_API_URL=https://api.agentteams.run \
POLLING_INTERVAL_MS=5000 \
TIMEOUT_MS=600000 \
RUNNER_CMD=opencode \
LOG_LEVEL=info \
DAEMON_VERBOSE_RUNNER_LOGS=false \
DAEMON_PROMPT_LOG_MODE=length \
node dist/index.js start
```

## 6. 동작 개요

`start` 실행 후 데몬은 다음 흐름으로 동작합니다.

1. 주기적으로 pending 트리거를 폴링합니다.
2. 트리거를 claim합니다.
3. 런타임 정보(작업 경로, API 키)를 조회합니다.
4. `RUNNER_CMD run "<prompt>"` 형식으로 프로세스를 실행합니다.
5. 종료 코드/타임아웃 결과에 따라 트리거 상태를 업데이트합니다.

동일 `agentConfigId`에 실행 중인 프로세스가 있으면 새 트리거는 `REJECTED` 처리됩니다.

## 7. 로그

- 데몬 자체 로그: 콘솔 출력
- 러너(stdout/stderr) 로그: 작업 경로의 `.agentteams/daemonLog/daemon-<triggerId>.log`

## 8. 자주 발생하는 오류

### `Missing token. Usage: agentteams-daemon init --token <token> ...`

- `init` 명령에서 `--token`을 넣지 않은 경우입니다.

### `Daemon token is missing. Run 'agentteams-daemon init --token <token>' first.`

- 실행 시 토큰을 찾을 수 없는 상태입니다.
- `init`을 먼저 실행하거나 `AGENTTEAMS_DAEMON_TOKEN` 환경변수를 설정하세요.

### `zsh: permission denied: agentteams-daemon`

- 전역으로 연결된 `agentteams-daemon` 실행 파일의 권한/경로 문제일 가능성이 큽니다.
- 아래 순서로 확인/복구하세요.

```bash
type -a agentteams-daemon
which agentteams-daemon
ls -l "$(which agentteams-daemon)"
```

```bash
cd daemon
npm run build
npm install -g .
hash -r
```

- 그래도 동일하면 실행 파일 권한을 확인하세요.

```bash
chmod +x /Users/justin/Project/Me/AgentTeams/daemon/dist/index.js
```
