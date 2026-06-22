# Kura Master Source

Ngày biên soạn: 2026-06-21

Nguồn: câu chuyện nghiệp vụ Kura với bệnh nhân giả định Sokha, bác sĩ Dara và nhân viên PSC Lina.

Tài liệu này là nguồn chuẩn nghiệp vụ cho Kura trong project này. Mục tiêu không phải kể lại câu chuyện theo văn xuôi, mà chuyển toàn bộ logic thành spec có thể dùng cho product, design, engineering, finance và ops. Khi tài liệu cũ và tài liệu mới mâu thuẫn, ưu tiên trạng thái mới hơn; tài liệu cũ chỉ dùng để hiểu lịch sử quyết định và lý do nghiệp vụ.

## 1. Bản chất của Kura

Kura không đơn thuần là ứng dụng booking xét nghiệm.

Kura là hệ thống phối hợp giữa:

- doctor origination;
- patient identity;
- booking;
- PSC reception;
- visit;
- sample/specimen;
- payment;
- receipt;
- lab processing;
- result release;
- doctor economics;
- insurance/claims;
- settlement;
- audit.

Chuỗi bằng chứng trung tâm là:

```text
Đúng người -> đúng booking -> đúng dịch vụ -> đúng mẫu -> đúng thanh toán -> đúng kết quả -> đúng người được hưởng tiền
```

Nếu một mắt xích không chắc chắn, mọi mắt xích phía sau đều có thể sai.

## 2. Hai thế hệ công nghệ

Kura hiện tồn tại dưới hai thế hệ công nghệ.

### 2.1 Thế hệ production hiện tại

Thế hệ đang chạy production gồm:

- backend monolith;
- clinic app cho bác sĩ và nhân viên PSC/internal;
- patient app cho bệnh nhân xem booking.

Backend hiện tại có các miền chính:

- patient;
- booking;
- visit;
- lab catalog;
- payment;
- insurance;
- audit.

Clinic app hiện có các mặt nghiệp vụ:

- order wizard;
- catalog;
- bookings;
- reception.

Patient app hiện chủ yếu là booking visibility portal, chưa phải patient health record đầy đủ.

### 2.2 Kura platform mới

Kura platform mới dùng:

- micro frontend theo persona;
- BFF riêng theo từng audience/persona;
- domain service giao tiếp qua gRPC;
- async event backbone.

Trạng thái milestone mới hơn trong nguồn:

- M1 tenancy floor đã ship ngày 2026-06-07.
- M2 identity và auth đã ship ngày 2026-06-08.
- M3 async outbox và relay đã ship ngày 2026-06-09.
- M4 workspace và membership đã ship ngày 2026-06-11.
- M5 clinic RBAC đã ship ngày 2026-06-14.
- M6 patient PII erasure đã ship ngày 2026-06-14.
- M7 lab và pricing services đã triển khai.
- M9.1 đến M9.7 về UI kit và lab admin đã ship ngày 2026-06-18.
- M8 CI/CD và AWS production deployment vẫn là trọng tâm hiện tại.

Kết luận quan trọng: nền tảng mới đã tiến xa, nhưng không đồng nghĩa toàn bộ nghiệp vụ production cũ đã chuyển sang đó.

## 3. Các actor chính

### 3.1 Patient

Sokha đại diện cho bệnh nhân. Patient có thể:

- ngồi trực tiếp với bác sĩ;
- nhận OTP;
- nhận booking code hoặc QR;
- đến PSC;
- thanh toán tại PSC, qua KHQR, hoặc qua payer khác;
- nhận kết quả khi release gate đủ điều kiện.

### 3.2 Doctor

Dara đại diện cho bác sĩ. Doctor:

- đăng nhập bằng clinic audience;
- làm việc trong workspace;
- cần professional verification/KYD trước khi tất cả quyền hành nghề mở đầy đủ;
- tạo booking;
- chọn xét nghiệm;
- sở hữu clinical attribution;
- chỉ được hưởng doctor spread nếu booking được tạo qua authenticated clinic app flow.

### 3.3 PSC/Internal Staff

Lina đại diện cho nhân viên PSC/reception. PSC staff:

- làm việc dưới internal/reception audience;
- tìm bằng booking code, phone hoặc name;
- xác minh identity tại physical encounter;
- tạo hoặc bắt đầu visit;
- xác nhận service flow;
- thu cash khi áp dụng;
- mở hoặc in receipt;
- capture NID và kích hoạt merge/assurance flow.

### 3.4 Kura Ops/Admin

Kura ops/admin:

- quản lý configuration, pricing, spread rule, override và remediation;
- xử lý merge phức tạp và audit case;
- có quyền rộng hơn nhưng mọi write phải được audit.

### 3.5 Insurer/Payer

Insurer hoặc payer:

- có thể cover một số order line nhưng không cover line khác;
- cần eligibility, coverage, claim state và evidence ở cấp line;
- có thể có rule riêng ảnh hưởng đến doctor remuneration.

## 4. Audience và access model

Backend production có năm audience chính:

- `admin`;
- `internal`;
- `clinic`;
- `patient`;
- `ingest`.

Nguyên tắc:

- Clinic user không gọi endpoint internal như internal staff.
- Patient không được đọc dữ liệu của patient khác.
- Internal staff bị giới hạn theo branch assignment.
- Admin có phạm vi rộng hơn.
- Ingest dùng API key riêng.
- Write từ admin, internal và clinic phải ghi audit log append-only với before/after diff đã scrub.

Cùng một object phải có projection khác nhau theo audience.

Ví dụ một booking:

- Doctor thấy patient, tests, clinical/order context và earnings context.
- Reception thấy identity resolution, collection và payment operation.
- Patient thấy status và test names an toàn.
- Finance thấy split và settlement.
- Public token chỉ thấy dữ liệu redacted.
- Admin thấy configuration và audit history.

Không nên dùng một DTO khổng lồ cho tất cả audience.

## 5. Workspace, login, KYD và RBAC

### 5.1 Doctor login

Doctor và clinic owner dùng clinic audience, không dùng patient audience hoặc internal audience.

Clinic authentication hiện tại:

- Clerk magic link login.
- Backend đổi Clerk identity thành Kura session.
- Access token lưu trong memory.
- Refresh token riêng.
- Refresh rotation và theft detection.

Clinic authentication v1 đã hoàn tất cho core magic link và session. Email code fallback, Google sign-in và một số cải tiến UX thuộc phần sau.

### 5.2 Workspace context

Sau đăng nhập, doctor vào workspace đại diện cho tổ chức hoặc phòng khám đang hoạt động.

Clinic app có các khu vực:

- Patients;
- Bookings;
- Orders;
- Catalog;
- Members;
- Workspaces.

Reception/internal staff không dùng cùng mặt nghiệp vụ với doctor; họ làm việc dưới `/reception`.

### 5.3 Professional verification

Kura phải phân biệt:

- user đã xác thực email;
- user có workspace;
- user có membership hợp lệ;
- user có role phù hợp;
- doctor đã qua professional/KYD verification;
- workspace hoặc branch được phép vận hành.

Clinic app có KYD/KYC gate để doctor upload license Bộ Y tế và chờ review trước khi toàn bộ practice mở đầy đủ.

Tên role giữa backend cũ và app/docs chưa thống nhất hoàn toàn. Khi chuyển sang RBAC của platform mới, role taxonomy cần được chuẩn hóa.

## 6. Domain object cốt lõi

### 6.1 Patient

Patient là con người được Kura nhận diện qua thời gian. Patient sống lâu hơn booking, visit, sample, payment và result.

Patient identity là tài sản toàn Kura, không thuộc riêng một clinic workspace. Patient từng được tạo bởi clinic khác vẫn có thể được reuse dưới dạng redacted candidate.

### 6.2 Identity evidence

Identity là tập hợp bằng chứng để nói patient đó là ai.

Bằng chứng có thể gồm:

- phone;
- OTP phone-control proof;
- name;
- DOB hoặc birth year;
- sex/gender;
- NID;
- document capture;
- PSC encounter verification;
- merge history.

Phone verification và identity assurance là hai chiều khác nhau.

### 6.3 Booking

Booking là lời hứa rằng một patient dự kiến nhận một nhóm dịch vụ.

Booking có thể tồn tại trước khi:

- patient đến;
- sample được lấy;
- payment được xác nhận;
- service được thực hiện;
- result tồn tại.

Booking không được đồng nhất với visit.

### 6.4 Visit

Visit là lần patient thật sự xuất hiện hoặc được phục vụ. Với patient-in PSC flow, visit nên bắt đầu khi patient xuất hiện và được nhận vào service flow, không phải chỉ vì doctor bấm Place order.

### 6.5 Order line

Order line là đơn vị nhỏ nhất đúng để tính:

- service execution;
- price;
- payer;
- insurance coverage;
- doctor share;
- Kura share;
- refund;
- split freeze.

Không tính pricing, coverage hoặc doctor economics chỉ ở cấp booking.

### 6.6 Sample

Sample/specimen là vật thể thật được lấy từ patient. Nó có custody và state riêng:

- expected;
- collected;
- barcode;
- collector;
- collection time;
- tube/specimen type;
- dispatched;
- received;
- accepted;
- rejected;
- recollection required.

### 6.7 Result

Result là đầu ra lâm sàng của test. Result cần:

- source/provenance;
- analyte mapping;
- unit normalization;
- reference range selection;
- abnormal flagging;
- validation;
- release authorization;
- amendment history.

### 6.8 Payment

Payment là bằng chứng tiền đã di chuyển. Payment không phải payment intent và không phải lựa chọn payment method.

### 6.9 Receipt

Receipt xác nhận một payment event. Receipt không thay thế invoice hoặc claim trong tương lai.

### 6.10 Split ledger row

Split ledger row là sự thật kinh tế bất biến về cách một order line được chia giữa doctor và Kura.

### 6.11 Settlement

Settlement cộng/net các ledger row trong một kỳ để biết cuối cùng ai nợ ai.

### 6.12 Workspace

Workspace là organizational context, nhưng không thay thế doctor person trong referral attribution hoặc per-doctor settlement.

## 7. Nguyên tắc patient identity

Kura không được xem patient identity là một ô tìm kiếm đơn giản.

Tên không đủ. Số điện thoại không đủ. Gia đình có thể dùng chung SIM. Patient có thể được đăng ký bởi clinic khác. Doctor có thể nhập sai năm sinh. Số điện thoại có thể bị tái cấp. Patient có thể hoàn toàn mới với Kura.

Chọn sai patient có thể gây:

- sample gắn sai người;
- result lộ cho người khác;
- longitudinal history bị trộn;
- refund sai đối tượng;
- doctor spread sai;
- insurance claim sai;
- hồ sơ không thể sửa sạch chỉ bằng đổi tên.

Vì vậy identity assurance phải rõ ràng và audit được.

## 8. Booking origination matrix

Booking origination có hai trục độc lập.

### 8.1 Trục 1: Kura có nhìn thấy patient không?

#### Patient in

Doctor gửi patient đến Kura PSC. Patient xuất hiện trực tiếp và reception có thể:

- kiểm tra giấy tờ;
- hỏi lại thông tin;
- capture NID;
- nâng assurance;
- kích hoạt merge khi cần.

Đây là identity flow mềm hơn vì Kura còn một physical verification point.

#### Blood in / Lab send in

Doctor tự lấy máu và chỉ gửi tube/specimen đến Kura. Patient không xuất hiện tại Kura.

Đây là flow nghiêm ngặt hơn vì Kura không có cơ hội sau đó để nhìn patient hoặc kiểm tra NID.

### 8.2 Trục 2: phone known hay unknown?

Sau khi OTP verified, Kura kiểm tra phone có gắn với existing patient nào không.

- `phone known`: phone liên kết với ít nhất một Kura patient.
- `phone unknown`: phone chưa có trong Kura.

### 8.3 Bốn thế giới

| Custody | Phone state | Ý nghĩa | V1 scope |
| --- | --- | --- | --- |
| Blood in | Phone unknown | Doctor gửi specimen cho số chưa biết | Later |
| Blood in | Phone known | Doctor gửi specimen cho số đã biết/shared phone | Later |
| Patient in | Phone known | Patient sẽ đến PSC và phone có candidate | In scope |
| Patient in | Phone unknown | Patient sẽ đến PSC và phone chưa có candidate | In scope |

V1 tập trung vào hai thế giới patient-in. Blood-in là sản phẩm riêng.

### 8.4 Cảnh báo về ký hiệu A/B/C/D

Notion dùng A/B/C/D cho hai khái niệm khác nhau:

- Bookings v1 A-D: các bước tuần tự doctor tạo booking, patient xem booking, PSC tìm booking, PSC thu tiền/in receipt.
- Booking Origination Matrix A-D: bốn quadrant custody và phone state.

Không dùng lại ký hiệu này trong UI/code nếu không disambiguate.

## 9. Face-to-face OTP trong doctor origination

OTP trong doctor originate không phải remote patient login.

Rule:

- Sokha phải đang ngồi cùng Dara.
- SMS OTP gửi đến phone của Sokha.
- Sokha đọc code cho Dara.
- Dara nhập code vào clinic app.
- Chỉ sau OTP thành công, Kura mới lookup phone known/unknown.

Không được:

- doctor nhập phone của người không có mặt rồi tạo booking từ xa;
- patient app tham gia bước originate này;
- dùng chung OTP namespace/key với patient login OTP.

OTP chứng minh:

- người đang có mặt kiểm soát SIM tại thời điểm đó.

OTP không chứng minh:

- người đó là chủ thật của medical record;
- name/DOB đúng;
- phone chưa từng bị tái cấp;
- người đó có quyền xem mọi result gắn với phone.

Vì vậy OTP chỉ là một chiều bằng chứng.

## 10. Phone known flow

Khi Kura tìm thấy patient gắn với verified phone:

- có thể có một candidate hoặc nhiều candidate;
- Kura không được auto-select candidate đầu tiên;
- doctor thấy redacted confirm cards;
- doctor và patient chọn đúng người.

Confirm card nên hiển thị:

- một phần name;
- một phần NID;
- một phần DOB/birth information;
- đầy đủ sex/gender.

Mục tiêu: đủ để xác nhận, nhưng không biến màn hình thành PHI directory.

### 10.1 Cross-organization reuse

Patient identity là tài sản toàn Kura. Patient tạo bởi clinic khác có thể xuất hiện dưới dạng redacted reusable candidate.

### 10.2 Shared phone

Nếu một phone liên kết với nhiều người trong gia đình:

- hiển thị tất cả candidate;
- luôn có lựa chọn "None of these / create new patient".

Nếu doctor chọn none of these, flow chuyển sang provisional patient creation.

### 10.3 Reuse rule

Khi reuse existing candidate, doctor không nên nhập lại toàn bộ identity. Nhập lại tạo cơ hội làm dữ liệu cũ và mới mâu thuẫn.

## 11. Phone unknown flow

Khi verified phone không có patient candidate, doctor nhập tối thiểu:

- name;
- sex/gender;
- birth year hoặc age;
- selected tests.

Kura tạo:

- provisional patient;
- booking code.

Quyết định kiến trúc ngày 2026-06-06:

- doctor tạo provisional patient ngay;
- booking không giữ identity rời rạc với `patient_id` rỗng;
- `booking.patient_id` luôn có giá trị.

Lý do:

- booking model không cần hỗ trợ null patient;
- mọi booking có patient reference;
- reception có object rõ ràng để xử lý;
- duplicate xử lý bằng merge thay vì identity blob lơ lửng.

Nghĩa vụ đi kèm:

- merge phải đáng tin;
- nếu merge yếu, provisional patient sẽ tích tụ và chia nhỏ lịch sử bệnh nhân.

## 12. Booking creation

Sau khi chọn hoặc tạo patient, doctor chọn tests.

Order wizard hiện có các bước:

1. Find/resolve patient.
2. Select tests from catalog.
3. Select payment method.
4. Select payment timing.
5. Pass verification gate.
6. Create booking and QR/code.

Payment method có thể gồm:

- cash;
- KHQR.

Payment timing có thể gồm:

- pay at clinic;
- pay at PSC later.

Ở thời điểm booking creation, payment thường mới là intent/metadata. Payment thật chỉ tồn tại khi PSC hoặc payment rail xác nhận giao dịch.

Booking khi mới sinh ra nghĩa là:

- patient được reference;
- doctor originator được biết;
- test list tồn tại;
- payment intention tồn tại;
- booking code tồn tại;
- patient chưa chắc đã đến;
- sample chưa chắc đã lấy;
- tiền chưa chắc đã thu;
- service chưa chắc đã thực hiện.

## 13. Patient-facing booking surfaces

### 13.1 Public booking page

Patient có thể scan QR hoặc mở public booking page không cần login.

Trang này cố ý hiển thị rất ít:

- booking status;
- patient name rút gọn/redacted;
- doctor và clinic;
- test names;
- preparation instructions;
- branch;
- collection time/window.

Không được hiển thị:

- DOB;
- MRN;
- full phone;
- price;
- result content.

Malformed token và unknown token phải trả cùng hành vi "not found" để tránh enumeration. Public endpoint phải rate limit phía server.

### 13.2 Authenticated patient portal

Patient có thể login bằng phone OTP.

Lần verify đầu tiên có thể implicit signup và tạo:

- user;
- patient;
- `PatientUserLink`;
- `UserIdentity`.

Patient-auth core đã ship gồm:

- phone OTP;
- JWT patient audience;
- refresh rotation;
- theft detection;
- audit.

Portal hiện chủ yếu cho booking visibility:

- dashboard;
- My bookings;
- booking codes;
- booking status;
- test names.

Chưa đầy đủ:

- lab result content;
- payment;
- insurance;
- non-lab appointments;
- complete notifications;
- Khmer localization.

Vì vậy patient app hiện chưa phải patient health record hoàn chỉnh.

## 14. PSC reception flow

Công việc đầu tiên của PSC là identity resolution, không phải thu tiền hay lấy máu.

Reception có thể tìm bằng:

- booking code;
- phone;
- name.

Reception có thể:

- mở booking detail;
- confirm and draw trong workflow đơn giản hiện tại;
- tạo walk-in visit khi không có pre-order.

### 14.1 Entry bằng booking code

Booking code là handle mạnh nhất để tìm đúng booking cụ thể, nhưng không chứng minh người đứng trước mặt Lina là patient trong booking. PSC vẫn phải kiểm tra identity.

### 14.2 Entry bằng phone hoặc name

Phone/name search có thể trả nhiều patient hoặc nhiều booking. UI phải hỗ trợ disambiguation và không được tự chọn candidate đầu tiên.

### 14.3 Walk in

Walk-in visit là nguồn nghiệp vụ khác doctor-originated booking.

Rule:

- walk-in không có doctor originator thì không được tự động có doctor spread.

## 15. Từ provisional đến verified identity

Khi provisional patient xuất hiện tại PSC, Lina có thể capture NID.

Đây là transition quan trọng:

- doctor biết đủ để tạo booking;
- PSC xác minh đủ để bảo vệ clinical record.

Kết quả NID capture có thể là:

1. Không có collision: patient assurance được nâng.
2. Có một old patient trùng NID: cần merge.
3. Conflict phức tạp: đưa vào merge queue/data steward.

Backend đã có:

- NID collision merge queue;
- assurance level như provisional và NID verified;
- assurance gate cho hành động nhạy cảm như refund và result release.

Tài liệu intake mới hơn cho thấy refund assurance gate được ưu tiên trước. Result release enforcement vẫn phụ thuộc vào hoàn thiện result pipeline.

### 15.1 Không gộp mọi thứ thành một badge verified

Phải hiển thị và reason riêng:

- phone control state;
- patient assurance state;
- document verification state;
- merge state;
- result release eligibility.

Ví dụ:

- patient điều khiển đúng SIM nhưng vẫn provisional;
- NID verified nhưng phone đã cũ;
- gia đình dùng shared SIM;
- old Kura patient vừa đổi số;
- new patient record có NID collision với old record.

## 16. Confirm and draw

Action hiện tại `confirm and draw` làm hai việc lớn:

- bắt đầu hoặc tạo visit;
- ghi nhận sample collection.

Booking lifecycle đơn giản hiện tại:

```text
JUST_CREATED -> SAMPLE_DRAWN -> RESULTS_BACK
```

Phân biệt quan trọng:

- Confirm nghĩa là patient đã xuất hiện, identity được kiểm tra, booking được nhận vào service flow và visit bắt đầu.
- Draw nghĩa là specimen thật sự được lấy, có collection time và collector, bắt đầu logistics tới lab.

Gộp API này hợp lý cho wedge ban đầu, nhưng yếu khi:

- patient check-in rồi phải chờ;
- draw thất bại;
- patient từ chối draw;
- chỉ lấy được một phần tube;
- cần recollection;
- payment xảy ra trước draw;
- booking có nhiều specimen type.

Về lâu dài cần tách identity event, visit event, payment event, draw attempt và sample collection.

## 17. Payment, receipt và cash flow

Bookings v1 đã hoàn tất cash-flow path:

1. Doctor tạo booking.
2. Patient xem booking.
3. PSC tìm booking.
4. PSC confirm and draw.
5. PSC thu cash.
6. Backend tạo payment và receipt.
7. PSC mở/in receipt PDF.

Bookings v1 đóng với 22 tickets hoàn tất. Existing patient lane chạy xuyên suốt từ doctor booking, patient portal, PSC lookup, confirm/draw, cash đến receipt.

Backend cũng có:

- dynamic Bakong KHQR;
- payment intent;
- transaction tracking;
- receipt PDF.

Money được lưu bằng:

- `amount_minor`;
- `currency_code`.

Không dùng số thập phân floating point cho tiền.

### 17.1 Các khái niệm payment phải tách biệt

Phải tách:

- payment method;
- payment timing;
- payment intent;
- payment transaction;
- receipt;
- settlement.

Khi doctor chọn "cash at PSC", doctor chưa thu tiền. Doctor chỉ khai báo expected payment handling. Payment thật chỉ tồn tại khi PSC hoặc payment rail xác nhận.

Không gộp mọi thứ vào một `paymentStatus`.

### 17.2 Ghi chú hardening từ demo cũ

Tài liệu Bookings v1 cũ từng ghi nhận:

- receipt PDF cần hardening authentication;
- line-item price có giai đoạn client gửi lên và server chỉ đối chiếu total;
- booking-to-payment từng là hai call không atomic.

Cần kiểm tra lại code hiện tại trước khi coi đây là defect còn tồn tại, nhưng các ghi chú này cho thấy payment demo và production ledger là hai mức trưởng thành khác nhau.

## 18. Lab catalog và pricing context

Catalog không chỉ là list test name và price.

Production lab module có model lớn gồm:

- test catalog;
- package;
- profile;
- panel;
- derived test hierarchy;
- canonical analytes;
- LOINC enrichment;
- category;
- age/sex-specific reference ranges;
- materialized effective catalog view;
- cart pricing;
- bundle optimization.

Cart pricing có set-cover optimization để tìm bundle/package combination tốt hơn thay vì chỉ cộng giá từng test.

Platform mới M7 tách:

- Lab service: catalog, reference ranges, `ExpandCart`.
- Pricing service: three-tier `ResolvePrice`.

M9 bổ sung admin BFF và master-data screens cho lab/pricing.

Dịch chuyển chiến lược:

```text
từ: catalog item có một price
sang: clinical catalog + context-aware pricing engine
```

## 19. Finance model ở cấp order line

Ví dụ booking của Sokha có:

- CBC;
- Creatinine;
- Lipid profile.

Mỗi line có thể khác nhau:

- insurance covered;
- self-pay;
- thuộc bundle;
- doctor spread 30%;
- doctor spread 10%;
- không có spread;
- chưa served vì thiếu specimen;
- refunded.

Vì vậy pricing, coverage và doctor share phải resolve ở cấp order line.

Mỗi line cần các con số core:

- `patient_price`;
- `doctor_share`;
- `kura_share`.

Đây là một trong những quyết định quan trọng nhất của hệ thống.

## 20. Doctor spread và patient price

Patient luôn trả full list price trừ khi có discount/coverage rule riêng.

Doctor spread là profit/commission của doctor, không phải patient discount.

Ví dụ:

- Sokha trả 100.
- Doctor spread là 30.
- Kura share là 70.

Nếu PSC/Kura thu 100:

- Kura giữ 100 ban đầu;
- Kura nợ doctor 30;
- Kura giữ 70.

Nếu clinic của Dara thu 100:

- Dara giữ 30;
- Dara nợ Kura 70.

Sokha vẫn trả 100 trong cả hai trường hợp.

### 20.1 Price và spread là hai trục riêng

Price trả lời:

- patient hoặc payer phải trả bao nhiêu.

Spread trả lời:

- doctor được hưởng bao nhiêu từ số tiền đó.

Doctor không được tự đặt retail price. Kura sở hữu và phê duyệt price, spread và override.

### 20.2 Override decision

PRD cũ nói v1 dùng global spread classes và chưa có workspace differentiation.

Quyết định mới hơn ngày 2026-06-15 supersede giả định này:

- cho phép per-workspace override cho cả price và spread;
- mọi override vẫn do Kura sở hữu và phê duyệt.

## 21. Doctor share chỉ sinh ra tại origination

Doctor share chỉ được tạo ở thời điểm origination.

Rule:

- doctor là referring/originating doctor chỉ khi chính doctor tạo booking qua authenticated clinic app flow;
- doctor identity phải đến từ authenticated session;
- không tin doctor ID do client gửi tùy ý;
- reception không thể retroactively tag walk-in để tạo doctor share;
- remediation phải là quy trình đặc biệt có audit, không phải dropdown sửa tay.

Lý do: ngăn gian lận khi internal staff hoặc doctor gắn doctor vào walk-in sau khi sự kiện đã xảy ra.

## 22. Paid plus served invariant

Trả tiền chưa đủ. Service phải thật sự được thực hiện.

Doctor split chỉ freeze khi:

- line đã paid theo rule tương ứng; và
- service đã served/performed.

Nếu paid nhưng chưa served:

- không tạo doctor share.

Nếu served nhưng payment rule chưa thỏa:

- split chưa freeze.

Invariant này ngăn:

- booking giả;
- office collection giả;
- payment claim nhưng không có sample;
- doctor tạo hàng loạt booking để lấy spread;
- refund sau earnings mà không đảo ledger.

## 23. Frozen split ledger

Khi order line đủ điều kiện, Kura tạo immutable split row snapshot.

Snapshot nên có:

- list price;
- resolved rule;
- spread percent hoặc fixed amount;
- doctor share;
- Kura share;
- collection point;
- referring/originating doctor;
- coverage verdict nếu có;
- freeze timestamp.

Sau khi freeze:

- history cũ không chạy lại khi admin đổi class, price hoặc spread rule;
- refund không sửa dòng cũ;
- refund tạo reversal row trong kỳ hiện tại.

Immutability là điều kiện để finance audit được.

## 24. Settlement

Settlement net toàn bộ economic ledger row trong một kỳ.

Ví dụ nửa tháng:

- Kura thu tại PSC và nợ Dara 300 spread.
- Dara thu tại office và nợ Kura 220.
- Kura nợ Dara 20 insurer kickback.
- Refund reversal là -10.

Kết quả:

```text
Kura nợ Dara: 320
Dara nợ Kura: 230
Net: Kura trả Dara 90
```

Settlement chạy theo doctor person, không theo clinic workspace. Clinic name có thể là grouping label trên report, nhưng referral/economic ownership thuộc doctor person. ABA payout account cũng thuộc doctor person.

Cadence:

- ngày 1 đến ngày 15;
- ngày 16 đến cuối tháng.

Pricing and Doctor Spreads v1 nên tạo:

- split resolution;
- frozen ledger;
- settlement report;
- exportable statement.

Automated payout thuộc Doctor Banking.

## 25. Doctor Banking

Doctor Banking biến con số settlement thành tiền thật.

Thiết kế hiện tại tập trung vào ABA Account on File.

Flow dự kiến:

1. Doctor mở Banking trong clinic app.
2. Doctor chọn connect ABA account.
3. Web hiển thị QR hoặc deep link.
4. Doctor mở ABA Mobile.
5. Doctor xác nhận bằng PIN ngân hàng.
6. Kura nhận token hoặc payment instrument reference.
7. Kura lưu token, masked account và instrument type.
8. Kura có thể dùng rail cho push hoặc pull.

Push dùng khi:

- Kura trả doctor spread;
- Kura trả acquisition/referral reward;
- net settlement dương cho doctor.

Pull dùng khi:

- doctor thu tiền tại office;
- net settlement nghĩa là doctor nợ Kura;
- Kura thực hiện merchant-initiated transaction theo authorization đã có.

Doctor Banking là clinic-audience self-service và cần KYD/KYC gate. Đây không phải ops process nhập số tài khoản thủ công.

## 26. Hai nghĩa của referral

`Referral` hiện có hai nghĩa khác nhau.

### 26.1 Clinical/patient origination

Dara gửi Sokha đến Kura làm lab. Đây có thể tạo doctor spread.

### 26.2 Doctor acquisition referral

Dara mời bác sĩ Vanna dùng Kura. Đây là growth referral scheme.

Reward design hiện tại:

- tổng reward: 20 USD;
- 5 USD khi referred doctor connect ABA Account on File;
- 15 USD khi booking đầu tiên của referred doctor đạt paid-plus-served.

Reward chỉ claim được bằng cách enroll ABA account. Mục tiêu chiến lược không chỉ là incentive payout, mà còn đưa doctor vào Doctor Banking rail.

Thuật ngữ khuyến nghị:

- patient origination hoặc clinical referral;
- doctor acquisition referral.

Không chỉ gọi cả hai là `referral` trong UI/code.

## 27. Insurance và claims

Insurance là per-line, không phải per-booking.

Một booking có thể gồm:

- một insurer-covered lab line;
- một non-covered self-pay line;
- một covered consultation fee;
- một normal doctor-spread lab line;
- một Kura-funded kickback line.

Legacy backend đã có entity như:

- `Insurer`;
- `PatientInsurancePolicy`;
- `VisitInsurance`;
- `Copay`;
- claim state như `PENDING`, `APPROVED`, `REJECTED`.

Clinic app production chưa có insurance flow hoàn chỉnh. NSSF integration chưa wired end-to-end. Claims rail mới hơn có schema và read-only eligibility, nhưng full claim processing vẫn thuộc roadmap.

### 27.1 Rule concept hiện tại

Non-covered line:

- patient trả list price như walk-in;
- nếu doctor originate booking, normal spread có thể áp dụng.

Insurer-covered lab line:

- design hiện mô tả Kura-funded doctor kickback;
- 10% list nếu booking không bill consult fee;
- 5% nếu booking có consult fee.

Covered consultation:

- insurer trả flat consultation fee;
- v1 pass through 100% cho doctor;
- Kura margin bằng 0.

### 27.2 Legal và incentive risk

Một số insurer có thể không chấp nhận doctor remuneration theo phần trăm từng test vì tạo incentive order quá nhiều.

Covered-lab percentage rule cần:

- contract confirmation;
- legal review;
- insurer-specific policy;
- audit trail;
- payer-level configuration;
- transparent explanation cho doctor.

## 28. Vì sao blood-in là sản phẩm riêng

Blood-in nhìn giống patient-in nhưng bản chất khác.

### 28.1 Patient-in

Patient xuất hiện. PSC có thể:

- nhìn patient;
- hỏi DOB;
- capture NID;
- merge provisional patient;
- nâng assurance.

### 28.2 Blood-in

Kura chỉ thấy:

- tube/specimen;
- requisition;
- dữ liệu doctor nhập;
- có thể là label.

Không có cơ hội sau đó để nhìn patient hoặc document.

### 28.3 Chokepoint của blood-in

`Reception` của blood-in là specimen accessioning, không phải quầy patient.

Lab receiving staff phải:

- nhận tube;
- đối chiếu requisition;
- kiểm tra label;
- quyết định specimen acceptability;
- resolve candidate identity;
- hold nếu identity unclear;
- reject nếu specimen không đạt;
- dùng audited carve-out khi specimen không thể lấy lại nhưng label có thiếu sót.

### 28.4 Minimum data nghiêm ngặt hơn

Blood-in order cần tối thiểu:

- phone;
- name;
- DOB hoặc age đủ để suy ra birth year;
- sex;
- tests.

Name + DOB là hai identifier vì Kura không còn physical verification point.

### 28.5 Không silent auto-create

Nếu Kura thấy possible matching candidate, hệ thống phải yêu cầu resolve rõ. Không được tự động tạo patient mới.

### 28.6 Không dùng handwritten requisition shortcut cho V1

OCR hoặc staff transcription của handwritten requisition đã bị park vì:

- chỉ chuyển việc từ doctor sang Kura staff;
- không scale;
- handwriting tạo clinical risk;
- patient không có mặt để sửa;
- silent auto-create quá nguy hiểm.

Blood-in vì vậy là later epic.

## 29. Result product boundary

Booking lifecycle có thể có `RESULTS_BACK`, nhưng status không phải full result pipeline.

Production note nói HL7v2 result ingest và PDF report generation vẫn planned, chưa hoàn thành end-to-end. Patient app cũng chưa expose full result content.

Hiện Kura có:

- booking state báo result đã về;
- lab catalog/reference range model mạnh;
- nền tảng để hiển thị result sau này.

Full result product còn cần:

- result ingest;
- analyte mapping;
- unit normalization;
- reference range selection;
- abnormal flagging;
- critical value handling;
- validation;
- report generation;
- result release authorization;
- patient identity assurance gate;
- doctor notification;
- patient notification;
- amendment history;
- provenance.

## 30. External lab result import

Có spike cụ thể cho BIOMED Phnom Penh.

Thử trên 5 PDF của cùng một patient từ tháng 1 đến tháng 5 năm 2026:

- extract 246 result rows;
- 181 numeric rows;
- 175 rows parse được reference range;
- 57 rows auto-flag High/Low;
- phần còn lại chủ yếu là qualitative value như positive, absence, trace, rare;
- longitudinal delta view dựng tự động.

Extraction gần như giải được cho template BIOMED vì PDF là text, không phải scan.

Vấn đề khó là canonical mapping.

### 30.1 Name collision

Ví dụ:

- blood glucose numeric;
- urine glucose qualitative.

Cả hai có thể tên "Glucose". Text normalization đơn thuần sẽ merge sai analyte.

### 30.2 Naming drift

Cùng analyte có thể thay đổi:

- singular/plural;
- casing;
- English/French name;
- exact name vs typo.

Nếu không map vào canonical analyte hoặc LOINC, thay đổi tên nhỏ sẽ tạo trend row mới và phá longitudinal history.

### 30.3 Provenance bắt buộc

Imported result không được âm thầm trộn với Kura-verified result.

UI phải hiển thị:

- source, ví dụ BIOMED;
- imported status;
- import date;
- original file;
- mapping confidence;
- Kura verified hay chưa;
- reference range source.

Scope đúng cho v1:

- Import BIOMED Phnom Penh reports.

Scope sai:

- Import any third-party lab.

Scope theo từng lab thực tế và an toàn hơn.

## 31. Patient authentication hardening

Patient auth core đã chạy, nhưng hardening vẫn quan trọng.

Các phần còn lại:

- chỉ gửi OTP đến supported countries;
- thống kê blocked-country attempt không lưu PII;
- anti-bombing controls;
- request và verify rate limit;
- daily Unimatrix spend kill switch;
- Sentry alerts cho burst/spend/failure;
- tracking `last_used_at` của phone identity;
- stale phone prompt;
- phone rebind tại physical encounter;
- identity-strength claim;
- forced token rotation.

OTP không chỉ là UX. OTP còn là:

- SMS cost surface;
- abuse surface;
- account-takeover surface;
- privacy surface;
- identity lifecycle surface.

Nếu phone bị tái cấp, OTP thành công không có nghĩa chủ mới được xem PHI cũ. Stale-phone và rebind phải được xử lý tại physical encounter.

## 32. New platform architecture

Platform mới có ba lớp.

### 32.1 Persona frontends

Shell:

- Admin;
- Clinic;
- Patient.

Mỗi shell tải domain micro frontend.

### 32.2 Persona BFFs

BFF:

- Admin BFF;
- Clinic BFF;
- Patient BFF;
- Public BFF.

Mỗi BFF expose API shape phù hợp audience.

### 32.3 Domain services

Domain services gồm:

- Identity;
- Scheduling;
- Notification;
- Lab;
- Pricing.

Services giao tiếp qua gRPC và giữ boundary rõ hơn backend monolith.

### 32.4 Cutover risk

Rủi ro platform lớn nhất không còn là build được service hay không. Rủi ro lớn nhất là cutover:

- contract compatibility;
- data migration;
- duplicate implementations;
- source of truth giữa cũ và mới;
- payment/ledger chuyển lúc nào;
- old booking code có tiếp tục resolve không;
- patient ID giữ nguyên hay cần mapping;
- audit history bảo toàn thế nào;
- tránh dual write;
- khi chạy song song, service nào sở hữu write.

## 33. Những gì đang chạy hoặc có core production

Dựa trên nguồn, có thể coi các phần sau đang tồn tại hoặc có core production capability:

- clinic authentication bằng magic link và Kura session;
- patient phone OTP và implicit signup;
- doctor và reception surfaces trong clinic app;
- patient search;
- lab catalog search;
- order cart;
- doctor tạo booking cho existing patient;
- patient xem booking;
- PSC lookup bằng code, phone hoặc name;
- confirm and draw;
- walk-in visit;
- cash payment;
- receipt PDF;
- backend KHQR capability;
- lab catalog model lớn;
- reference range model;
- cart pricing;
- patient insurance entities cơ bản;
- audit log;
- workspace và membership;
- platform mới M1 đến M7;
- lab admin foundation trong M9.

Bookings v1 được đánh dấu Done.

## 34. Đã quyết định nhưng chưa nên coi là production hoàn chỉnh

Các phần sau đã có quyết định/design target nhưng chưa nên assume fully production-complete:

- doctor originate cho known phone với redacted candidate list;
- doctor originate cho unknown phone với provisional patient;
- shared-phone handling;
- cross-organization patient reuse;
- clinic-scoped OTP namespace;
- full identity assurance gate;
- result release gate;
- Pricing and Doctor Spreads engine;
- immutable split ledger;
- per-doctor settlement;
- per-workspace price và spread overrides;
- Doctor Banking ABA Account on File;
- growth referral reward;
- claims rail;
- insurer-specific remuneration;
- full product cutover lên platform mới;
- production deployment của platform mới.

Ghi chú: Clinic Patient Intake vẫn có ticket 16 ghi "architecture blocked", nhưng Booking Origination Matrix đã resolve quyết định provisional patient và OTP namespace ngày 2026-06-06. Blocker hiện tại là rework/re-split ticket, không còn là thiếu architecture decision.

## 35. Later scope

Scope later gồm:

- blood-in / lab-send-in;
- specimen accessioning product;
- generic import-any-third-party-lab;
- full result content trong patient app;
- full HL7 result ingest;
- full PDF report pipeline;
- complete claims processing;
- NSSF end-to-end integration;
- automated settlement payout production;
- promotion-code product;
- complete patient notifications;
- Khmer localization;
- full clinical EMR hoặc longitudinal doctor workspace.

## 36. Kura chưa phải full EMR

Clinic/doctor app production hiện chủ yếu là:

- patient search;
- order creation;
- catalog;
- booking lifecycle;
- workspace;
- members;
- reception;
- earnings trong roadmap.

Nguồn chưa cho thấy production EMR đầy đủ với:

- problem list;
- diagnosis;
- medication;
- progress note;
- care plan;
- longitudinal clinical summary;
- e-prescription;
- clinical decision support;
- result interpretation note.

Định nghĩa đúng hơn:

```text
Kura là clinic and laboratory coordination platform có identity, ordering, payment và doctor economics.
```

## 37. Các state machine phải tách biệt

Kura không được gom tất cả vào một status field.

### 37.1 Identity state

Ví dụ:

```text
Provisional -> NID captured -> NID verified
```

Phone verification chạy trên một chiều riêng.

### 37.2 Booking state

Ví dụ production đơn giản:

```text
JUST_CREATED -> SAMPLE_DRAWN -> RESULTS_BACK
```

Future booking lifecycle nên có:

- cancelled;
- expired;
- no-show;
- partially served.

### 37.3 Visit state

Ví dụ:

```text
Created -> Checked in -> In service -> Completed
```

### 37.4 Sample state

Ví dụ:

```text
Expected -> Collected -> Dispatched -> Received -> Accepted
```

State bổ sung:

- draw failed;
- deferred;
- rejected;
- recollection required.

### 37.5 Economic state

Ví dụ:

```text
Unresolved -> Priced -> Paid -> Served -> Split frozen -> Settled
```

Refund tạo reversal row, không mutate history.

## 38. Rủi ro lớn nhất

### 38.1 Source of truth bị chia theo thời gian

Code documentation ngày 2026-06-12 nói M5/M6 chưa ship. Project cards mới hơn nói M5/M6 ship ngày 2026-06-14. Intake pages còn giữ label blocked cũ trong khi decision sau đã resolve architecture.

Rủi ro: product, design và engineering đọc các trang khác nhau rồi tin các trạng thái khác nhau.

### 38.2 A/B/C/D ambiguity

Bookings v1 và Origination Matrix đều dùng A/B/C/D cho nghĩa khác nhau.

Rủi ro: team nhầm flow step với matrix quadrant.

### 38.3 Referral ambiguity

Clinical referral và doctor acquisition referral là hai nghiệp vụ khác nhau.

Rủi ro: finance, growth và clinic team nói chuyện khác nhau dưới cùng một label.

### 38.4 Booking, visit và sample bị coupling

`confirm and draw` gộp nhiều event.

Rủi ro: future phlebotomy workflow không mô tả được waiting, failed draw, partial collection hoặc recollection.

### 38.5 Identity assurance enforcement chưa đầy đủ

Refund gate được ưu tiên, nhưng result-release gate chưa hoàn chỉnh.

Rủi ro: privacy exposure qua result release.

### 38.6 Doctor office collection fraud risk

Office-collected cash là self-declared debt.

Control cần có:

- authenticated originator;
- paid evidence;
- served evidence;
- immutable ledger.

### 38.7 Pricing rule đổi sau booking

Nếu không snapshot, historical economics thay đổi khi admin sửa price/spread class.

Frozen ledger giải quyết việc này.

### 38.8 Booking-level coverage/pricing

Mixed coverage là bình thường.

Rule: tính ở cấp line.

### 38.9 Imported result mất provenance

Nếu BIOMED/imported result trộn âm thầm với Kura-verified result, doctor không biết nguồn nào chịu trách nhiệm.

### 38.10 Public booking PHI leakage

Public token page phải luôn redacted. Không thêm DOB, full phone, price hoặc result content chỉ vì tiện.

### 38.11 Dual platform migration

Legacy và platform mới overlap ở patient, booking, pricing và lab.

Rủi ro: dual write làm dữ liệu phân kỳ.

### 38.12 Frontend test debt

Bookings v2 chủ yếu tồn tại để bổ sung frontend test harness và contract reconciliation cho:

- `/orders`;
- PSC search;
- cash entry;
- patient bookings.

Rủi ro: flow chạy được nhưng regression protection chưa tương xứng.

## 39. Thứ tự phát triển hợp lý

### 39.1 Bước 1: Đóng chặt patient-in origination

Hoàn thiện:

- known-phone reuse;
- unknown-phone provisional creation.

Cần đủ:

- face-to-face OTP;
- candidate list;
- redacted confirm card;
- shared-phone handling;
- none-of-these path;
- booking code;
- NID capture tại PSC;
- merge queue;
- assurance state.

### 39.2 Bước 2: Tách identity và sample events

Thay `confirm and draw` duy nhất bằng event rõ hơn:

- patient confirmed;
- visit started;
- payment confirmed;
- draw attempted;
- sample collected;
- draw failed;
- sample deferred;
- sample rejected.

### 39.3 Bước 3: Biến order line thành trung tâm tài chính

Mỗi line cần:

- catalog item;
- quantity;
- price snapshot;
- payer;
- coverage verdict;
- doctor originator;
- collection point;
- served evidence;
- split state;
- refund state.

### 39.4 Bước 4: Xây immutable economic ledger trước payout

Không automate chuyển tiền cho doctor trước khi có:

- frozen split rows;
- reversal mechanism;
- settlement report;
- audit;
- reconciliation;
- dispute handling.

### 39.5 Bước 5: Hoàn thiện claims rail

Claims rail phải trả per line:

- eligible hay không;
- covered hay không;
- allowed amount;
- copay;
- payer;
- consultation fee;
- remuneration rule;
- evidence required;
- claim state;
- rejection reason.

### 39.6 Bước 6: Result provenance và release gate

Trước khi mở result cho patient:

- identity assurance đủ;
- result có source/provenance;
- result được validate;
- imported và Kura-verified được phân biệt;
- amendment được lưu;
- critical result escalation tồn tại.

### 39.7 Bước 7: Production cutover platform mới

M8 phải trả lời:

- legacy API ngừng write lúc nào;
- patient ID migrate ra sao;
- old booking code resolve ở đâu;
- historical payment và receipt nằm ở đâu;
- split ledger bắt đầu từ thời điểm nào;
- audit history preserve ra sao;
- rollback có an toàn không;
- có cần dual-read không;
- dual-write tránh bằng cách nào;
- ai tuyên bố source of truth sau cutover.

## 40. Target end-to-end future flow

1. Dara đăng nhập clinic app, vào đúng workspace và đã có professional verification.
2. Sokha ngồi trực tiếp với Dara.
3. Dara nhập phone của Sokha.
4. Sokha nhận OTP và đọc cho Dara.
5. Kura tìm thấy hai candidate vì gia đình dùng chung SIM.
6. Dara và Sokha xem redacted cards rồi chọn đúng patient.
7. Dara chọn ba tests.
8. Catalog expand bundles và pricing engine resolve price.
9. Booking lưu patient, doctor originator, workspace context, test lines, payment intention và price snapshot.
10. Sokha nhận booking code.
11. Patient app chỉ hiển thị safe data.
12. Sokha đến PSC.
13. Lina tìm bằng code.
14. Lina kiểm tra identity và thấy NID đang thiếu.
15. Lina capture NID.
16. Kura tìm thấy một provisional duplicate cũ và bắt đầu merge handling mà không block safe service.
17. Visit bắt đầu.
18. Lina thu tiền hoặc xác nhận payer.
19. Payment được ghi lại.
20. Lina draw sample.
21. Sample được barcode, collected và gửi lab.
22. Mỗi order line thành served khi đủ evidence.
23. Lab trả result.
24. Reference range được chọn theo age và sex.
25. Abnormal flags được tạo.
26. Result được validate.
27. Identity assurance đủ nên result được release.
28. Patient app thông báo Sokha.
29. Mỗi order line resolve patient price, doctor share, Kura share, insurance coverage và collector.
30. Paid-plus-served lines freeze split rows.
31. Cuối nửa tháng, Kura net toàn bộ rows: Kura owes doctor, doctor owes Kura, refund reversals, insurer pass-through, legitimate kickbacks.
32. Net settlement được tạo.
33. Doctor Banking chuyển tiền qua ABA Account on File.
34. Mọi thay đổi có audit.
35. Mọi result có provenance.
36. Mọi access decision dùng audience, workspace, role và patient assurance.

## 41. Non-negotiable invariants

- Patient identity không phải phone number.
- OTP chỉ chứng minh current SIM control.
- Patient identity là Kura-wide, không clinic-owned.
- Doctor-originated OTP phải face-to-face và clinic-scoped.
- Booking phải reference patient, kể cả provisional patient.
- Provisional patient chỉ an toàn nếu merge/assurance flow đáng tin.
- Booking không phải visit.
- Visit không phải sample.
- Payment intent không phải payment transaction.
- Receipt không phải settlement.
- Public booking page phải luôn redacted.
- Doctor share chỉ sinh ra từ authenticated doctor-created booking.
- Reception không thể retroactively tạo doctor spread.
- Patient trả list price; doctor spread không phải patient discount.
- Paid plus served là điều kiện trước khi freeze split.
- Economic ledger row immutable; refund tạo reversal.
- Price, coverage, doctor share, refund và served evidence là per order line.
- Insurance coverage là per line, không phải per booking.
- Imported result phải giữ provenance.
- Result release cần identity assurance phù hợp.
- Blood-in là accessioning product riêng, không phải biến thể nhỏ của patient-in.
- Tránh dual write trong platform migration.

## 42. Glossary

`Patient in`
: Patient xuất hiện trực tiếp tại Kura PSC.

`Blood in` / `Lab send in`
: Doctor gửi specimen đến Kura nhưng patient không xuất hiện.

`Phone known`
: Verified phone map với ít nhất một existing Kura patient.

`Phone unknown`
: Verified phone không map với Kura patient nào.

`Provisional patient`
: Patient object được tạo khi chưa đủ identity evidence mạnh, chờ PSC/ops assurance hoặc merge.

`Identity assurance`
: Độ mạnh của bằng chứng rằng patient record đại diện đúng con người thật.

`Doctor origination`
: Booking được tạo bởi authenticated doctor trong clinic app.

`Doctor spread`
: Doctor economic share của một paid-and-served order line.

`Paid plus served`
: Invariant yêu cầu vừa thỏa payment vừa có service evidence trước khi freeze split.

`Frozen split ledger`
: Immutable economic snapshot cho một order line.

`Settlement`
: Netting định kỳ tất cả economic rows giữa doctor và Kura.

`ABA Account on File`
: Banking instrument lưu cho doctor payout hoặc pull theo authorization.

`Clinical referral`
: Doctor gửi patient đi làm lab.

`Doctor acquisition referral`
: Doctor mời doctor khác vào Kura.

`Public booking token`
: Handle cho unauthenticated redacted booking view.

`Result provenance`
: Nguồn, mapping và verification context của result data.
