# Stock Wizard: 뉴스 가치 평가 + 역발상 강화

## TL;DR

> **Quick Summary**: 뉴스에 대한 투자 가치 평가 시스템을 추가하고, 역발상 분석의 깊이/창의성을 강화하여 더 정교한 숨겨진 수혜주 추천을 제공한다.
> 
> **Deliverables**:
> - 뉴스 가치 평가 서비스 (3축 복합 평가)
> - 강화된 역발상 프롬프트 (금지 패턴, 4-5단계 추론)
> - 2단계 분석 파이프라인
> - UI 뉴스 가치 뱃지 및 시각적 강조
> - 테스트 인프라 (vitest) 및 단위 테스트
> 
> **Estimated Effort**: Medium (3-5일)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6 → Task 8 → Task 9

---

## Context

### Original Request
Stock Wizard 프로젝트에 뉴스 가치 평가 시스템 추가 및 역발상 분석 깊이 강화 요청.

### Interview Summary
**Key Discussions**:
- 뉴스 가치 평가: 복합 평가 (시장 영향력 + 희소성 + 역발상 적합도)
- 역발상 강화: 단계 수 증가 + 횡적 연결 + 금지 패턴 명시
- 아키텍처: 2단계 파이프라인 (가치 평가 → 상위 뉴스만 역발상 분석)
- 테스트: TDD with vitest
- UI: 라벨/뱃지 + 시각적 강조

**Research Findings**:
- 현재 테스트 인프라 없음 - vitest 셋업 필요
- DB에 news_value 관련 필드 없음 - 마이그레이션 필요
- 기존 프롬프트는 3단계 chain만 요구 - 확장 필요

### Guardrails (from Metis Review)
- 기존 뉴스 소스(Finnhub, Google RSS)는 변경하지 않음
- 성능 추적 로직은 건드리지 않음
- API 비용 증가 최소화 (2단계 파이프라인으로 해결)
- 기존 API 응답 형식 호환성 유지

### Momus High Accuracy Review (PASSED)

**검증 완료 항목:**
- [x] 15/15 참조 파일 존재 확인
- [x] 라인 번호 참조 정확성 검증 (analysis.ts:150-193, recommendations.ts:72-85 등)
- [x] Import 경로 패턴 일관성 (`@/lib/...` alias)
- [x] 타입 정의 호환성 (기존 Recommendation 인터페이스 확장 가능)

**수정된 이슈:**
- [x] `src/__tests__/` 디렉토리 미존재 → Task 1에 생성 단계 추가
- [x] `supabase/migrations/` 디렉토리 미존재 → Task 6에 생성 단계 추가
- [x] Zod 스키마 업데이트 지침 불명확 → Task 2에 구체적 필드 목록 추가
- [x] 테스트 서브디렉토리 생성 누락 → Task 7, 9에 mkdir 단계 추가

---

## Work Objectives

### Core Objective
뉴스의 투자 가치를 평가하여 고가치 뉴스만 선별하고, 더 깊고 창의적인 역발상 추론을 통해 숨겨진 수혜주 추천 품질을 향상시킨다.

### Concrete Deliverables
- `src/lib/services/newsEvaluation.ts` - 뉴스 가치 평가 서비스
- `src/lib/prompts/newsValue.ts` - 뉴스 평가 프롬프트
- `src/lib/prompts/contrarian.ts` - 강화된 역발상 프롬프트 (업데이트)
- `src/lib/services/analysis.ts` - 2단계 파이프라인 (업데이트)
- `src/types/database.ts` - 스키마 확장 (업데이트)
- `supabase/migrations/xxx_add_news_value.sql` - DB 마이그레이션
- `src/components/ui/NewsValueBadge.tsx` - 뉴스 가치 뱃지 컴포넌트
- `src/components/recommendations/RecommendationCard.tsx` - UI 업데이트
- `vitest.config.ts` - 테스트 설정
- `src/__tests__/*.test.ts` - 단위 테스트

### Definition of Done
- [ ] `pnpm test` 실행 시 모든 테스트 통과
- [ ] `pnpm build` 성공
- [ ] 뉴스 가치 점수가 DB에 저장됨
- [ ] UI에서 뉴스 가치 뱃지 표시됨
- [ ] 역발상 추론이 4단계 이상으로 생성됨

### Must Have
- 3축 뉴스 가치 평가 (market_impact, unexpectedness, contrarian_potential)
- 금지 패턴 목록이 프롬프트에 포함
- 최소 4단계 reasoning chain
- 뉴스 가치 뱃지 UI 컴포넌트
- vitest 테스트 인프라

### Must NOT Have (Guardrails)
- 새로운 뉴스 API 소스 추가 금지
- 실시간 스트리밍 구현 금지
- 기존 API 응답 형식 breaking change 금지
- 성능 추적 로직 변경 금지
- 불필요한 의존성 추가 금지

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (신규 셋업 필요)
- **User wants tests**: TDD
- **Framework**: vitest

### TDD Workflow

각 TODO는 RED-GREEN-REFACTOR 패턴을 따름:

**Task Structure:**
1. **RED**: 테스트 파일 먼저 작성, 실행하면 FAIL
2. **GREEN**: 최소한의 구현으로 테스트 통과
3. **REFACTOR**: 코드 정리, 테스트 여전히 PASS

**Test Setup Task (Task 1에서 수행):**
- Install: `pnpm add -D vitest @testing-library/react`
- Config: `vitest.config.ts` 생성
- Verify: `pnpm test` 실행 가능
- Example: `src/__tests__/example.test.ts` 생성하여 검증

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: 테스트 인프라 셋업 (vitest)
├── Task 2: 타입 정의 확장
└── Task 3: 뉴스 가치 평가 프롬프트 작성

Wave 2 (After Wave 1):
├── Task 4: 뉴스 가치 평가 서비스 구현
├── Task 5: 역발상 프롬프트 강화
└── Task 6: DB 마이그레이션

Wave 3 (After Wave 2):
├── Task 7: UI 컴포넌트 (NewsValueBadge)
├── Task 8: 분석 서비스 2단계 파이프라인

Wave 4 (Final):
└── Task 9: Daily Cron 업데이트 + 통합 테스트

Critical Path: Task 1 → Task 2 → Task 4 → Task 8 → Task 9
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 5, 7, 8 | 2, 3 |
| 2 | None | 4, 6, 7, 8 | 1, 3 |
| 3 | None | 4, 5 | 1, 2 |
| 4 | 1, 2, 3 | 8 | 5, 6 |
| 5 | 1, 3 | 8 | 4, 6 |
| 6 | 2 | 8, 9 | 4, 5 |
| 7 | 1, 2 | 9 | 8 |
| 8 | 4, 5, 6 | 9 | 7 |
| 9 | 6, 7, 8 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | 3개 병렬: quick(1), quick(2), writing(3) |
| 2 | 4, 5, 6 | 3개 병렬: ultrabrain(4), writing(5), quick(6) |
| 3 | 7, 8 | 2개 병렬: visual-engineering(7), ultrabrain(8) |
| 4 | 9 | 1개 순차: ultrabrain(9) |

---

## TODOs

- [ ] 1. 테스트 인프라 셋업 (vitest)

  **What to do**:
  - `mkdir -p src/__tests__` 실행하여 테스트 디렉토리 생성 (현재 미존재)
  - `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` 실행
  - `vitest.config.ts` 생성 (React + jsdom 환경)
  - `package.json`에 `"test": "vitest"`, `"test:run": "vitest run"` 스크립트 추가
  - `src/__tests__/example.test.ts` 생성하여 설정 검증

  **Must NOT do**:
  - Jest 사용 금지 (vitest 사용)
  - 불필요한 테스트 유틸리티 추가 금지

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 설정 작업, 복잡한 로직 없음
  - **Skills**: [`coding-standards`]
    - `coding-standards`: TypeScript/Node.js 설정 패턴 참조
  - **Skills Evaluated but Omitted**:
    - `tdd-workflow`: 인프라 셋업 단계라 TDD 패턴 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:
  
  **Pattern References**:
  - `package.json:5-10` - 기존 스크립트 구조 참조하여 test 스크립트 추가 위치 확인

  **External References**:
  - Vitest 공식 문서: `https://vitest.dev/guide/` - 설정 방법
  - Next.js + Vitest: `https://nextjs.org/docs/app/building-your-application/testing/vitest`

  **WHY Each Reference Matters**:
  - package.json: 기존 스크립트 컨벤션 유지
  - Vitest 문서: Next.js App Router와의 호환성 설정 필수

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `vitest.config.ts` 파일 생성됨
  - [ ] `pnpm test` 실행 → vitest 실행됨
  - [ ] `src/__tests__/example.test.ts` 작성 및 PASS
  - [ ] `pnpm test:run` → 1 test passes

  **Manual Verification:**
  - [ ] `pnpm test:run` 실행
  - [ ] Expected output: `✓ src/__tests__/example.test.ts` 포함

  **Commit**: YES
  - Message: `chore: setup vitest test infrastructure`
  - Files: `vitest.config.ts`, `package.json`, `src/__tests__/example.test.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 2. 타입 정의 확장

  **What to do**:
  - `src/types/database.ts`에 `NewsValue` 인터페이스 추가
  - `Recommendation` 인터페이스에 뉴스 가치 관련 optional 필드 추가:
    - `news_market_impact?: number`
    - `news_unexpectedness?: number`
    - `news_contrarian_potential?: number`
    - `news_overall_score?: number`
    - `news_value_label?: 'hot' | 'notable' | 'normal'`
    - `news_evaluation_reason?: string`
  - `src/types/index.ts`에서 새 타입 export
  - `src/lib/services/analysis.ts`의 Zod 스키마 업데이트:
    - `RecommendationSchema`에 `newsValue` optional 필드 추가
    - `NewsValueSchema` 새로 정의 (3축 점수 + 라벨 + 사유)

  **Must NOT do**:
  - 기존 필드 삭제/변경 금지 (하위 호환성)
  - Optional이 아닌 required 필드 추가 금지 (기존 데이터 호환)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 타입 정의 추가, 단순 작업
  - **Skills**: [`coding-standards`]
    - `coding-standards`: TypeScript 타입 정의 패턴
  - **Skills Evaluated but Omitted**:
    - `backend-patterns`: 타입만 정의, 로직 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 6, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/types/database.ts:1-47` - 기존 타입 정의 패턴 (ReasoningStep, Recommendation 등)
  - `src/lib/services/analysis.ts:5-19` - Zod 스키마 패턴 참조

  **Type Definition to Add**:
  ```typescript
  export interface NewsValue {
    market_impact: number;      // 0-1: 시장 영향력
    unexpectedness: number;     // 0-1: 희소성/의외성
    contrarian_potential: number; // 0-1: 역발상 적합도
    overall_score: number;      // 0-1: 종합 점수
    value_label: 'hot' | 'notable' | 'normal'; // UI 표시용
    evaluation_reason: string;  // 평가 근거
  }
  ```

  **WHY Each Reference Matters**:
  - database.ts: 기존 인터페이스 명명 규칙 및 구조 따르기
  - analysis.ts: Zod 스키마와 TypeScript 인터페이스 동기화 패턴

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `src/__tests__/types.test.ts` 생성
  - [ ] NewsValue 타입 검증 테스트 작성
  - [ ] `pnpm test:run` → PASS

  **Manual Verification:**
  - [ ] `pnpm build` 성공 (타입 에러 없음)
  - [ ] IDE에서 NewsValue 자동완성 확인

  **Commit**: YES
  - Message: `feat(types): add NewsValue interface and extend Recommendation`
  - Files: `src/types/database.ts`, `src/types/index.ts`
  - Pre-commit: `pnpm build`

---

- [ ] 3. 뉴스 가치 평가 프롬프트 작성

  **What to do**:
  - `src/lib/prompts/newsValue.ts` 새 파일 생성
  - 3축 평가 기준 정의 (market_impact, unexpectedness, contrarian_potential)
  - Few-shot 예시 3개 이상 포함
  - JSON 출력 형식 명시

  **Must NOT do**:
  - 역발상 추론 포함 금지 (이건 별도 프롬프트)
  - 주식 추천 포함 금지

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 프롬프트 엔지니어링은 창의적 글쓰기 작업
  - **Skills**: [`coding-standards`]
    - `coding-standards`: 프롬프트 파일 구조화 패턴
  - **Skills Evaluated but Omitted**:
    - `backend-patterns`: 프롬프트 텍스트 작성, 백엔드 로직 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/lib/prompts/contrarian.ts:1-20` - 기존 프롬프트 파일 구조
  - `src/lib/services/analysis.ts:29-122` - Few-shot 예시 작성 패턴

  **Prompt Design Guidelines**:
  ```
  평가 기준:
  1. market_impact (시장 영향력): 0-1
     - 1.0: 금리 결정, 무역 협정, 대형 M&A
     - 0.7: 산업 규제 변화, 주요 기업 실적
     - 0.4: 개별 기업 뉴스, 일반 경제 지표
     - 0.1: 루머, 의견 기사
  
  2. unexpectedness (희소성/의외성): 0-1
     - 1.0: 예측 불가능한 돌발 이벤트 (자연재해, 정치 급변)
     - 0.7: 예상보다 크게 벗어난 결과
     - 0.4: 어느 정도 예측 가능했던 이벤트
     - 0.1: 예정된/반복적 이벤트
  
  3. contrarian_potential (역발상 적합도): 0-1
     - 1.0: 2-3차 파급 효과가 명확, 숨겨진 수혜자 추론 용이
     - 0.7: 간접 수혜 산업 존재하나 덜 명확
     - 0.4: 직접 영향만 명확, 간접 효과 제한적
     - 0.1: 단일 기업/산업에만 영향
  ```

  **WHY Each Reference Matters**:
  - contrarian.ts: 프롬프트 export 패턴, 한국어 프롬프트 스타일
  - analysis.ts: Few-shot JSON 형식, 출력 스키마 구조

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `src/__tests__/prompts.test.ts` 생성
  - [ ] 프롬프트 상수 존재 여부 테스트
  - [ ] `pnpm test:run` → PASS

  **Manual Verification:**
  - [ ] 프롬프트 내용 리뷰 - 3개 평가 축 모두 포함 확인
  - [ ] Few-shot 예시가 JSON 형식으로 올바른지 확인

  **Commit**: YES
  - Message: `feat(prompts): add news value evaluation prompt with 3-axis criteria`
  - Files: `src/lib/prompts/newsValue.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 4. 뉴스 가치 평가 서비스 구현

  **What to do**:
  - `src/lib/services/newsEvaluation.ts` 새 파일 생성
  - `evaluateNewsValue(newsItems: NewsItem[]): Promise<EvaluatedNews[]>` 함수 구현
  - OpenAI API 호출하여 뉴스 가치 평가
  - Zod로 응답 스키마 검증
  - 에러 핸들링 및 fallback 로직

  **Must NOT do**:
  - 역발상 분석 포함 금지 (별도 서비스)
  - 캐싱 로직 추가 금지 (이 단계에서는)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: OpenAI API 통합, Zod 검증, 에러 핸들링 등 복잡한 로직
  - **Skills**: [`backend-patterns`, `coding-standards`]
    - `backend-patterns`: API 통합 패턴, 에러 핸들링
    - `coding-standards`: TypeScript 패턴, Zod 사용법
  - **Skills Evaluated but Omitted**:
    - `tdd-workflow`: 이미 TDD로 진행 중이므로 별도 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `src/lib/services/analysis.ts:150-193` - OpenAI API 호출 패턴, JSON 모드, Zod 검증
  - `src/lib/openai.ts` - OpenAI 클라이언트 가져오기 패턴
  - `src/lib/services/news.ts:3-11` - NewsItem 인터페이스

  **API/Type References**:
  - `src/types/database.ts` - NewsValue 인터페이스 (Task 2에서 추가)
  - `src/lib/prompts/newsValue.ts` - 평가 프롬프트 (Task 3에서 추가)

  **Implementation Pattern**:
  ```typescript
  export interface EvaluatedNews extends NewsItem {
    value: NewsValue;
  }
  
  export async function evaluateNewsValue(
    newsItems: NewsItem[]
  ): Promise<EvaluatedNews[]> {
    // 1. 프롬프트 구성
    // 2. OpenAI API 호출 (json_object 모드)
    // 3. Zod로 응답 검증
    // 4. NewsItem과 NewsValue 병합하여 반환
  }
  ```

  **WHY Each Reference Matters**:
  - analysis.ts: 동일한 프로젝트의 OpenAI 호출 패턴 따르기
  - openai.ts: 싱글톤 클라이언트 재사용
  - news.ts: 입력 타입 호환성 보장

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `src/__tests__/newsEvaluation.test.ts` 생성
  - [ ] Mock OpenAI 응답으로 evaluateNewsValue 테스트
  - [ ] Zod 검증 실패 케이스 테스트
  - [ ] `pnpm test:run` → PASS

  **Manual Verification:**
  - [ ] 실제 OpenAI API 호출 테스트 (개발 환경)
  - [ ] 응답에 market_impact, unexpectedness, contrarian_potential 포함 확인

  **Commit**: YES
  - Message: `feat(services): implement news value evaluation with OpenAI`
  - Files: `src/lib/services/newsEvaluation.ts`, `src/lib/services/index.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 5. 역발상 프롬프트 강화

  **What to do**:
  - `src/lib/prompts/contrarian.ts` 전면 재작성
  - 금지 패턴 목록 추가 (뻔한 1차 연결)
  - 최소 4단계 reasoning chain 요구
  - 횡적 연결(다른 산업으로 점프) 강제
  - Few-shot 예시 3개로 확대, 더 창의적인 예시로 교체

  **Must NOT do**:
  - 뉴스 가치 평가 내용 포함 금지 (분리된 관심사)
  - 기존 출력 JSON 구조 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 창의적 프롬프트 엔지니어링
  - **Skills**: [`coding-standards`]
    - `coding-standards`: 프롬프트 구조화
  - **Skills Evaluated but Omitted**:
    - `backend-patterns`: 텍스트 작성만, 로직 없음

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `src/lib/prompts/contrarian.ts:1-20` - 현재 프롬프트 (전면 교체 대상)
  - `src/lib/services/analysis.ts:29-122` - Few-shot 예시 형식

  **Banned Patterns to Include**:
  ```
  금지 패턴 (절대 추천 금지):
  - 전기차 뉴스 → 배터리/충전 기업
  - AI 뉴스 → GPU/반도체 기업
  - 금리 인상 → 은행주
  - 유가 상승 → 정유사
  - 환율 변동 → 수출/수입 기업
  - 부동산 규제 → 건설사
  
  이런 1차 연결은 누구나 생각할 수 있음.
  진정한 역발상은 3-4단계를 거쳐 의외의 산업에서 수혜자를 찾는 것.
  ```

  **Enhanced Example Structure**:
  ```
  뉴스: "글로벌 반도체 부족 장기화"
  ❌ 직접 연결 (금지): 삼성전자, TSMC, ASML
  ✓ 역발상 추론:
  1) 반도체 부족 → 자동차 생산 지연 → 중고차 가격 상승
  2) 중고차 수요 증가 → 차량 상태 진단 수요 증가
  3) 중고차 진단 기술 → OBD 스캐너/차량 IoT
  4) 차량 IoT 통신 → 차량용 eSIM/커넥티비티 칩
  추천: 차량용 커넥티비티 솔루션 기업
  ```

  **WHY Each Reference Matters**:
  - 현재 contrarian.ts: 교체 대상이지만 export 형식 유지 필요
  - analysis.ts: JSON 출력 형식 호환성 유지

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `src/__tests__/prompts.test.ts` 업데이트
  - [ ] 금지 패턴 목록 존재 확인 테스트
  - [ ] 최소 4단계 요구 문구 포함 확인 테스트
  - [ ] `pnpm test:run` → PASS

  **Manual Verification:**
  - [ ] 프롬프트 내용 리뷰
  - [ ] 금지 패턴 6개 이상 포함 확인
  - [ ] "4단계" 또는 "네 단계" 문구 포함 확인

  **Commit**: YES
  - Message: `feat(prompts): enhance contrarian prompt with banned patterns and 4-step requirement`
  - Files: `src/lib/prompts/contrarian.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 6. DB 마이그레이션 (Supabase)

  **What to do**:
  - `mkdir -p supabase/migrations` 실행하여 마이그레이션 디렉토리 생성 (현재 미존재)
  - `001_add_news_value_fields.sql` 마이그레이션 파일 생성
  - `recommendations` 테이블에 뉴스 가치 컬럼 추가
  - 마이그레이션 실행 가이드를 파일 상단 주석으로 작성

  **Must NOT do**:
  - 기존 컬럼 삭제/변경 금지
  - NOT NULL 제약조건 추가 금지 (기존 데이터 호환)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL 작성, 복잡한 로직 없음
  - **Skills**: [`backend-patterns`]
    - `backend-patterns`: DB 마이그레이션 패턴
  - **Skills Evaluated but Omitted**:
    - `clickhouse-io`: Supabase는 PostgreSQL, ClickHouse 아님

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Task 2 (타입 정의 참조)

  **References**:

  **API/Type References**:
  - `src/types/database.ts` - NewsValue 인터페이스 (Task 2에서 추가)
  - `src/lib/supabase.ts` - Supabase 클라이언트 패턴

  **Migration SQL Template**:
  ```sql
  -- Add news value fields to recommendations table
  ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS news_market_impact REAL,
  ADD COLUMN IF NOT EXISTS news_unexpectedness REAL,
  ADD COLUMN IF NOT EXISTS news_contrarian_potential REAL,
  ADD COLUMN IF NOT EXISTS news_overall_score REAL,
  ADD COLUMN IF NOT EXISTS news_value_label TEXT,
  ADD COLUMN IF NOT EXISTS news_evaluation_reason TEXT;

  -- Add index for filtering by news value
  CREATE INDEX IF NOT EXISTS idx_recommendations_news_score 
  ON recommendations (news_overall_score DESC);
  ```

  **WHY Each Reference Matters**:
  - database.ts: TypeScript 타입과 DB 컬럼 이름 일치시키기
  - supabase.ts: 테이블 이름 확인 (recommendations)

  **Acceptance Criteria**:

  **Manual Verification:**
  - [ ] SQL 파일 문법 검증: `psql` 또는 Supabase SQL Editor에서 구문 검사
  - [ ] 마이그레이션 실행 후 `\d recommendations`로 컬럼 추가 확인

  **Commit**: YES
  - Message: `feat(db): add news value fields migration`
  - Files: `supabase/migrations/001_add_news_value_fields.sql`
  - Pre-commit: N/A (SQL 파일)

---

- [ ] 7. UI 컴포넌트: NewsValueBadge

  **What to do**:
  - `src/components/ui/NewsValueBadge.tsx` 새 파일 생성
  - 뉴스 가치 라벨에 따른 뱃지 렌더링 (hot/notable/normal)
  - 시각적 차별화 (색상, 아이콘)
  - `src/components/ui/index.ts`에서 export

  **Must NOT do**:
  - 새로운 UI 라이브러리 추가 금지
  - 기존 Tailwind 패턴에서 벗어나지 않기

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 디자인 및 구현
  - **Skills**: [`frontend-patterns`, `coding-standards`]
    - `frontend-patterns`: React 컴포넌트 패턴
    - `coding-standards`: TypeScript props 패턴
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 단일 뱃지 컴포넌트라 전체 UX 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `src/components/ui/Badge.tsx` - 기존 뱃지 컴포넌트 패턴
  - `src/components/ui/Card.tsx` - Tailwind 스타일링 패턴

  **Design Spec**:
  ```typescript
  interface NewsValueBadgeProps {
    label: 'hot' | 'notable' | 'normal';
    score?: number; // optional: 점수 표시
    className?: string;
  }
  
  // 색상 매핑
  // hot: 빨간색 배경, 불꽃 아이콘
  // notable: 노란색 배경, 별 아이콘
  // normal: 회색 배경, 아이콘 없음
  ```

  **WHY Each Reference Matters**:
  - Badge.tsx: 기존 뱃지 스타일과 일관성 유지
  - Card.tsx: Tailwind 클래스 네이밍 컨벤션 참조

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `mkdir -p src/__tests__/components` 실행 (서브디렉토리 생성)
  - [ ] `src/__tests__/components/NewsValueBadge.test.tsx` 생성
  - [ ] 각 label별 렌더링 테스트
  - [ ] `pnpm test:run` → PASS

  **Manual Verification (Playwright 권장):**
  - [ ] Storybook 또는 개발 서버에서 컴포넌트 시각적 확인
  - [ ] hot/notable/normal 각각 색상 차이 확인
  - [ ] 스크린샷: `.sisyphus/evidence/task-7-badges.png`

  **Commit**: YES
  - Message: `feat(ui): add NewsValueBadge component`
  - Files: `src/components/ui/NewsValueBadge.tsx`, `src/components/ui/index.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 8. 분석 서비스 2단계 파이프라인 업데이트

  **What to do**:
  - `src/lib/services/analysis.ts` 수정
  - `analyzeNewsForStocks` 함수를 2단계 파이프라인으로 변경:
    1. Stage 1: 뉴스 가치 평가 → 상위 N개 필터링
    2. Stage 2: 필터링된 뉴스에 대해 역발상 분석
  - 반환 타입에 NewsValue 포함
  - 기존 API 호환성 유지

  **Must NOT do**:
  - 기존 함수 시그니처 breaking change 금지
  - 기존 반환 타입 필드 삭제 금지

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 복잡한 비동기 파이프라인 로직, 타입 안전성
  - **Skills**: [`backend-patterns`, `coding-standards`, `tdd-workflow`]
    - `backend-patterns`: 서비스 레이어 패턴
    - `coding-standards`: TypeScript 패턴
    - `tdd-workflow`: 기존 테스트 유지하며 리팩토링
  - **Skills Evaluated but Omitted**:
    - `frontend-patterns`: 백엔드 서비스 작업

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 4, 5, 6

  **References**:

  **Pattern References**:
  - `src/lib/services/analysis.ts:150-193` - 현재 analyzeNewsForStocks 구현
  - `src/lib/services/newsEvaluation.ts` - 뉴스 가치 평가 서비스 (Task 4에서 추가)

  **API/Type References**:
  - `src/types/database.ts` - NewsValue, Recommendation 타입
  - `src/lib/prompts/contrarian.ts` - 강화된 프롬프트 (Task 5에서 수정)

  **Implementation Pattern**:
  ```typescript
  export async function analyzeNewsForStocks(
    newsItems: { headline: string; summary?: string }[],
    market: 'KR' | 'US',
    options?: { topN?: number } // 기본값 5
  ): Promise<AnalysisOutput> {
    // Stage 1: 뉴스 가치 평가
    const evaluated = await evaluateNewsValue(newsItems);
    
    // 상위 N개 필터링
    const topNews = evaluated
      .sort((a, b) => b.value.overall_score - a.value.overall_score)
      .slice(0, options?.topN ?? 5);
    
    // Stage 2: 역발상 분석 (기존 로직)
    const recommendations = await generateContrarianRecommendations(topNews, market);
    
    // 뉴스 가치 정보 포함하여 반환
    return { recommendations };
  }
  ```

  **WHY Each Reference Matters**:
  - 현재 analysis.ts: 기존 구조 유지하며 확장
  - newsEvaluation.ts: Stage 1 로직 호출
  - contrarian.ts: Stage 2에서 강화된 프롬프트 사용

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `src/__tests__/analysis.test.ts` 업데이트
  - [ ] 2단계 파이프라인 동작 테스트 (mock)
  - [ ] 기존 테스트 여전히 PASS
  - [ ] `pnpm test:run` → ALL PASS

  **Manual Verification:**
  - [ ] 실제 API 호출하여 파이프라인 동작 확인
  - [ ] 반환값에 news_value 관련 필드 포함 확인
  - [ ] reasoning_chain이 4단계 이상인지 확인

  **Commit**: YES
  - Message: `feat(analysis): implement 2-stage pipeline with news value filtering`
  - Files: `src/lib/services/analysis.ts`
  - Pre-commit: `pnpm test:run`

---

- [ ] 9. Daily Cron 업데이트 및 통합 테스트

  **What to do**:
  - `src/app/api/cron/daily-analysis/route.ts` 수정
  - 새로운 분석 파이프라인 사용
  - DB 저장 시 뉴스 가치 필드 포함
  - `src/components/recommendations/RecommendationCard.tsx` 업데이트하여 NewsValueBadge 표시
  - 전체 흐름 통합 테스트

  **Must NOT do**:
  - Cron 스케줄 변경 금지
  - 인증 로직 변경 금지

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 통합 작업, 여러 컴포넌트 조율
  - **Skills**: [`backend-patterns`, `frontend-patterns`, `tdd-workflow`]
    - `backend-patterns`: API 라우트 패턴
    - `frontend-patterns`: React 컴포넌트 업데이트
    - `tdd-workflow`: 통합 테스트
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 기존 컴포넌트 수정만, 새 디자인 아님

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final, sequential)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  **Pattern References**:
  - `src/app/api/cron/daily-analysis/route.ts:1-95` - 현재 Cron 구현
  - `src/lib/services/recommendations.ts:72-85` - saveRecommendation 함수
  - `src/components/recommendations/RecommendationCard.tsx:1-77` - 현재 카드 구현

  **API/Type References**:
  - `src/types/database.ts` - 확장된 Recommendation 타입
  - `src/components/ui/NewsValueBadge.tsx` - 뱃지 컴포넌트 (Task 7에서 추가)

  **Code Changes**:
  1. **route.ts**: saveRecommendation 호출 시 뉴스 가치 필드 추가
  2. **RecommendationCard.tsx**: NewsValueBadge import 및 렌더링 추가

  **WHY Each Reference Matters**:
  - route.ts: 분석 파이프라인 호출 위치
  - recommendations.ts: DB 저장 인터페이스
  - RecommendationCard.tsx: 최종 UI 렌더링

  **Acceptance Criteria**:

  **TDD Verification:**
  - [ ] `mkdir -p src/__tests__/integration` 실행 (서브디렉토리 생성)
  - [ ] `src/__tests__/integration/dailyAnalysis.test.ts` 생성
  - [ ] 전체 파이프라인 통합 테스트 (mock)
  - [ ] `pnpm test:run` → ALL PASS

  **Manual Verification (CRITICAL):**
  - [ ] `pnpm dev` 실행
  - [ ] Cron 엔드포인트 수동 호출: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-analysis`
  - [ ] 응답에 news value 관련 정보 포함 확인
  - [ ] 홈페이지에서 RecommendationCard에 NewsValueBadge 표시 확인
  - [ ] 스크린샷: `.sisyphus/evidence/task-9-integration.png`

  **Final Build Verification:**
  - [ ] `pnpm build` → 성공
  - [ ] `pnpm test:run` → ALL PASS

  **Commit**: YES
  - Message: `feat: integrate news value into daily analysis and UI`
  - Files: `src/app/api/cron/daily-analysis/route.ts`, `src/components/recommendations/RecommendationCard.tsx`
  - Pre-commit: `pnpm build && pnpm test:run`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `chore: setup vitest test infrastructure` | vitest.config.ts, package.json | pnpm test:run |
| 2 | `feat(types): add NewsValue interface` | src/types/*.ts | pnpm build |
| 3 | `feat(prompts): add news value evaluation prompt` | src/lib/prompts/newsValue.ts | pnpm test:run |
| 4 | `feat(services): implement news value evaluation` | src/lib/services/newsEvaluation.ts | pnpm test:run |
| 5 | `feat(prompts): enhance contrarian prompt` | src/lib/prompts/contrarian.ts | pnpm test:run |
| 6 | `feat(db): add news value fields migration` | supabase/migrations/*.sql | N/A |
| 7 | `feat(ui): add NewsValueBadge component` | src/components/ui/*.tsx | pnpm test:run |
| 8 | `feat(analysis): implement 2-stage pipeline` | src/lib/services/analysis.ts | pnpm test:run |
| 9 | `feat: integrate news value into daily analysis and UI` | route.ts, RecommendationCard.tsx | pnpm build |

---

## Success Criteria

### Verification Commands
```bash
pnpm test:run          # Expected: All tests pass
pnpm build             # Expected: Build successful
pnpm lint              # Expected: No errors
```

### Final Checklist
- [ ] 뉴스 가치 3축 평가 동작 (market_impact, unexpectedness, contrarian_potential)
- [ ] 역발상 추론 4단계 이상 생성
- [ ] 금지 패턴이 추천에서 배제됨
- [ ] UI에 뉴스 가치 뱃지 표시
- [ ] DB에 뉴스 가치 필드 저장
- [ ] 모든 테스트 통과
- [ ] 빌드 성공
