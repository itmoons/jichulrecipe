export const metadata = {
  title: "계정 삭제 안내 | 지출레시피",
};

export default function AccountDeletePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">
          지출레시피 계정 삭제 안내
        </h1>

        <section className="space-y-6 leading-7 text-gray-700">
          <p>
            지출레시피는 사용자가 언제든지 계정 및 관련 데이터를 삭제할 수
            있도록 지원합니다.
          </p>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              1. 계정 삭제 방법
            </h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>앱에 로그인합니다.</li>
              <li>설정 메뉴로 이동합니다.</li>
              <li>“회원 탈퇴” 또는 “계정 삭제”를 선택합니다.</li>
              <li>안내에 따라 삭제를 완료합니다.</li>
            </ol>

            <p className="mt-3">
              또는 아래 이메일을 통해 삭제 요청이 가능합니다.
            </p>

            <p className="font-medium mt-2">
              이메일: your-email@example.com
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              2. 삭제되는 데이터
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>계정 정보 (이메일, 사용자 ID)</li>
              <li>지출 기록 및 통계 데이터</li>
              <li>커플 연동 정보</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              3. 보관되는 데이터
            </h2>
            <p>
              법령에 따라 일부 데이터는 일정 기간 보관될 수 있습니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>접속 로그: 최대 3개월</li>
              <li>거래 관련 기록: 최대 5년</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">
              4. 유의사항
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>계정 삭제 후 데이터는 복구되지 않습니다.</li>
              <li>삭제 요청은 즉시 처리됩니다.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}