export const metadata = {
  title: "개인정보처리방침 | 지출레시피",
  description: "지출레시피 개인정보처리방침",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <header className="mb-10 border-b border-gray-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            개인정보처리방침
          </h1>
          <p className="mt-3 text-sm text-gray-600 md:text-base">
            지출레시피는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을
            준수합니다. 본 방침은 서비스에서 어떤 정보를 수집하고, 어떻게
            이용하며, 어떻게 보호하는지를 설명합니다.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            시행일: 2026년 3월 22일
          </p>
        </header>

        <div className="space-y-10 leading-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. 수집하는 개인정보 항목</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-medium text-gray-900">① 회원가입 및 로그인 시</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>이메일 주소</li>
                  <li>비밀번호(인증 서비스 내 암호화 처리)</li>
                  <li>사용자 식별자(UID)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">② 서비스 이용 과정에서</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>지출 데이터 (금액, 카테고리, 메모, 날짜 등)</li>
                  <li>커플 연동 정보 (상대 사용자 식별 정보 등)</li>
                  <li>알림 및 설정 정보</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900">③ 자동 수집 정보</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>기기 정보 (운영체제, 앱 버전 등)</li>
                  <li>접속 로그 및 이용 기록</li>
                  <li>오류 로그 및 서비스 안정화 관련 정보</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>회원 식별 및 로그인 인증</li>
              <li>가계부 기능 제공 (지출 기록, 통계, 분석 등)</li>
              <li>커플 가계부 기능 제공 (데이터 공유 및 동기화)</li>
              <li>서비스 개선 및 오류 분석</li>
              <li>부정 이용 방지 및 보안 유지</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              3. 개인정보의 보관 및 이용 기간
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                회원 탈퇴 시 개인정보는 지체 없이 삭제합니다. 다만, 관계 법령에
                따라 일정 기간 보관이 필요한 경우 해당 법령에 따라 보관할 수
                있습니다.
              </p>

              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                        항목
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                        보관 기간
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                        근거
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-b border-gray-100 px-4 py-3">
                        접속 로그
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        최대 3개월
                      </td>
                      <td className="border-b border-gray-100 px-4 py-3">
                        통신비밀보호법
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">거래 관련 기록</td>
                      <td className="px-4 py-3">5년</td>
                      <td className="px-4 py-3">전자상거래 등에서의 소비자보호에 관한 법률</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. 개인정보의 제3자 제공</h2>
            <div className="space-y-3 text-gray-700">
              <p>지출레시피는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</p>
              <p>다만, 다음의 경우에는 예외로 할 수 있습니다.</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령에 따라 제출 의무가 발생한 경우</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. 개인정보 처리 위탁</h2>
            <div className="space-y-3 text-gray-700">
              <p>서비스 운영을 위해 아래와 같은 외부 서비스를 이용할 수 있습니다.</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Supabase: 사용자 인증, 데이터베이스 및 백엔드 서비스 제공</li>
                <li>클라우드 인프라 제공업체: 서비스 호스팅 및 운영 환경 제공</li>
              </ul>
              <p>
                회사는 위탁받은 업체가 개인정보를 안전하게 처리하도록 필요한
                관리적, 기술적 조치를 취합니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. 이용자의 권리</h2>
            <div className="space-y-3 text-gray-700">
              <p>이용자는 언제든지 자신의 개인정보에 대해 다음 권리를 행사할 수 있습니다.</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>개인정보 열람 요청</li>
                <li>개인정보 수정 또는 삭제 요청</li>
                <li>개인정보 처리 정지 요청</li>
              </ul>
              <p>
                회원 탈퇴 또는 별도 문의를 통해 개인정보 삭제를 요청할 수
                있습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. 개인정보 보호 조치</h2>
            <ul className="list-disc space-y-1 pl-6 text-gray-700">
              <li>비밀번호 및 인증 정보 보호</li>
              <li>HTTPS 기반 암호화 통신 적용</li>
              <li>접근 권한 최소화 및 권한 관리</li>
              <li>서버 접근 통제 및 로그 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. 아동의 개인정보 보호</h2>
            <p className="text-gray-700">
              지출레시피는 만 13세 미만 아동을 주요 대상자로 하지 않습니다.
              만약 만 13세 미만 아동의 개인정보가 수집된 사실이 확인될 경우,
              해당 정보는 관련 법령에 따라 지체 없이 삭제 또는 필요한 조치를
              취합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              9. 개인정보처리방침의 변경
            </h2>
            <p className="text-gray-700">
              본 개인정보처리방침은 법령, 정책 또는 서비스 내용 변경에 따라
              수정될 수 있으며, 변경 시 앱 또는 웹페이지를 통해 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">10. 문의처</h2>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-gray-700">
              <p>개인정보 관련 문의는 아래로 연락해 주시기 바랍니다.</p>
              <div className="mt-3 space-y-1">
                <p>
                  이메일: <span className="font-medium">readyspace0810@gmail.com</span>
                </p>
                <p>
                  개발자/운영자: <span className="font-medium">지출레시피</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}