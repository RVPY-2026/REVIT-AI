# Hướng dẫn cấu hình đăng nhập Google và cấp quyền quản trị đầu tiên

Tài liệu này hướng dẫn chủ tài khoản RVPY kết nối đăng nhập Google với dự án Supabase và kích hoạt tài khoản quản trị đầu tiên. Hãy cấu hình trên môi trường thử nghiệm trước. Khi triển khai chính thức, làm lại các bước với dự án Supabase và địa chỉ website của môi trường production.

## Cần chuẩn bị

- Quyền chủ sở hữu tài khoản Google sẽ quản lý dự án Google Cloud.
- Quyền chủ sở hữu tổ chức và dự án Supabase đúng của RVPY.
- Ứng dụng đã chạy được trên máy tính; database đã migrate và seed.
- Địa chỉ Gmail được chủ dự án duyệt để cấp quyền `admin`.

Không gửi thông tin xác thực qua chat, không commit vào Git và không đặt Google OAuth Client Secret trong biến `NEXT_PUBLIC_*`. Supabase sẽ lưu secret trong cấu hình Auth Provider.

## 1. Lấy URL của dự án Supabase

1. Mở [Supabase](https://supabase.com/dashboard) và chọn dự án RVPY.
2. Mở **Project Settings → API**. Một số phiên bản dashboard có thể hiển thị mục này dưới tên **Project Settings → Data API**.
3. Sao chép **Project URL** và **publishable key** để cấu hình `.env.local`. Publishable key được phép dùng ở phía trình duyệt; tuyệt đối không lấy secret key hoặc service-role key thay cho publishable key.
4. Lấy project reference từ Project URL. Ví dụ URL `https://example-ref.supabase.co` thì reference là `example-ref`.
5. Tạo Google callback URL theo đúng định dạng:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

Đây là URL Google chuyển về Supabase. Nó khác với callback `/auth/callback` của ứng dụng ở bước 4.

## 2. Cấu hình màn hình đồng ý của Google

1. Mở [Google Cloud Console](https://console.cloud.google.com/) và chọn hoặc tạo Google Cloud project do chủ dự án RVPY quản lý.
2. Mở **Google Auth Platform → Branding**. Điền tên ứng dụng, email hỗ trợ người dùng và email liên hệ của nhà phát triển. Lưu lại; nếu Google yêu cầu, đọc và chấp nhận Google API Services User Data Policy.
3. Mở **Google Auth Platform → Audience**. Chọn **External** nếu người dùng đăng nhập bằng Gmail thông thường. Giữ ứng dụng ở chế độ **Testing** trong lúc thiết lập staging.
4. Tại **Test users**, chọn **Add users**, nhập từng Gmail cần thử đăng nhập rồi lưu. Khi ứng dụng ở chế độ Testing, chỉ các email trong danh sách này mới hoàn tất được OAuth.
5. Chỉ yêu cầu các quyền đăng nhập cơ bản: `openid`, `email`, `profile`. Không yêu cầu thêm quyền Google Drive hoặc Sheets cho chức năng đăng nhập.

Google có thể đổi tên menu. Nếu giao diện cũ hơn, các mục tương ứng thường nằm trong **APIs & Services → OAuth consent screen** và **Credentials**.

## 3. Tạo OAuth Client cho website

1. Trong Google Cloud, mở **Google Auth Platform → Clients** (hoặc **APIs & Services → Credentials**) và chọn tạo client mới.
2. Chọn loại **Web application** và đặt tên dễ nhận biết, ví dụ `RVPY Staging Web`.
3. Trong **Authorized JavaScript origins**, thêm địa chỉ chạy local:

   ```text
   http://localhost:3000
   ```

   Khi đã có địa chỉ staging hoặc production, thêm đúng origin tương ứng, ví dụ `https://staging.example.com`. Origin không có đường dẫn và không có dấu `/` ở cuối.
4. Trong **Authorized redirect URIs**, thêm callback đã tạo ở bước 1:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

5. Tạo client. Sao chép **Client ID** và **Client secret** vào trình quản lý mật khẩu để sử dụng ở bước tiếp theo. Google có thể chỉ hiển thị secret lúc tạo; nếu làm mất, hãy tạo hoặc xoay vòng secret mới rồi cập nhật lại Supabase.

## 4. Bật Google Provider trong Supabase

1. Quay lại dự án Supabase, mở **Authentication → Sign In / Providers** (dashboard cũ có thể ghi **Authentication → Providers**).
2. Mở **Google**, bật provider và dán Google **Client ID** cùng **Client secret** vào đúng ô.
3. Lưu cấu hình. Sau khi lưu xong, kiểm tra Google provider hiển thị trạng thái đã bật.
4. Mở **Authentication → URL Configuration**.
5. Đặt **Site URL** bằng origin ứng dụng đang cấu hình. Khi chạy trên máy tính:

   ```text
   http://localhost:3000
   ```

6. Trong **Redirect URLs**, thêm callback chính xác của ứng dụng:

   ```text
   http://localhost:3000/auth/callback
   ```

   Khi có website staging, thêm callback tương ứng, ví dụ `https://staging.example.com/auth/callback`. Chỉ thêm các địa chỉ môi trường đang dùng.

Hai callback có mục đích khác nhau: Google chuyển về Supabase tại `/auth/v1/callback`; sau đó Supabase chuyển về ứng dụng RVPY tại `/auth/callback`.

## 5. Cấu hình môi trường local và chạy ứng dụng

Trong thư mục gốc dự án, điền Project URL và publishable key đã lấy ở bước 1 vào `.env.local`:

```dotenv
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Không commit `.env.local` lên Git. Không đặt Google Client Secret trong file này. Sau khi sửa biến môi trường, khởi động lại máy chủ Next.js. Nếu ứng dụng vẫn dùng dữ liệu giả, kiểm tra giá trị là chữ thường `false` rồi khởi động lại.

Nếu database staging chưa được khởi tạo, làm theo `docs/staging-setup.md` để cấu hình database URL, chạy migration và seed dữ liệu tham chiếu trước khi tiếp tục.

## 6. Cấp quyền admin đầu tiên

Đăng nhập Google chỉ xác nhận danh tính người dùng; thao tác này không tự cấp quyền quản trị RVPY. Tài khoản nhân sự và role phải được thêm vào database của ứng dụng trước.

1. Ở thư mục gốc dự án, tạo file local được Git bỏ qua `data/bootstrap-staff.json`. Tạo thư mục `data` nếu chưa có:

   ```json
   {
     "staff": [
       { "email": "owner@example.com", "name": "RVPY Admin", "roles": ["admin"] }
     ],
     "sources": []
   }
   ```

2. Thay email mẫu bằng đúng Gmail đã được chủ dự án duyệt. Email phải trùng với Google account sẽ dùng để đăng nhập. Chỉ thêm tài khoản sale và nguồn quảng cáo khi chủ dự án đã duyệt.
3. Chạy lệnh:

   ```powershell
   pnpm db:staff data/bootstrap-staff.json
   ```

4. Kiểm tra kết quả báo đúng số tài khoản. Không commit file JSON này và không đưa dữ liệu học viên thật vào file.

Lệnh trên tạo hoặc cập nhật tài khoản nhân sự và role trong ứng dụng; lệnh không tạo Google account hay mật khẩu. Khi Gmail đó đăng nhập Google lần đầu, ứng dụng sẽ liên kết danh tính đăng nhập với tài khoản đã khai báo.

## 7. Thử toàn bộ luồng đăng nhập

1. Chạy ứng dụng và mở `http://localhost:3000/dang-nhap`.
2. Chọn **Đăng nhập với Google** và đăng nhập bằng Gmail vừa được thêm vào danh sách test user của Google và file bootstrap nhân sự.
3. Chấp nhận màn hình đăng nhập cơ bản của Google. Ứng dụng sẽ chuyển về RVPY; tài khoản admin hoặc sale được đưa đến `/quan-tri`.
4. Thử bằng một Gmail chưa được cấp role. Tài khoản đó phải đến `/chua-kich-hoat`, không được vào khu quản trị.
5. Nếu Gmail là test user nhưng vào ứng dụng thấy trang chưa kích hoạt, OAuth của Google đã chạy được. Hãy kiểm tra Gmail chính xác và role còn hiệu lực trong dữ liệu bootstrap nhân sự.

Chủ tài khoản tự nhập mật khẩu và mã xác minh trong cửa sổ Google. Không yêu cầu họ gửi mật khẩu hoặc mã dùng một lần cho người hỗ trợ.

## Lỗi thường gặp

| Hiện tượng | Cần kiểm tra |
|---|---|
| Google báo `redirect_uri_mismatch` | OAuth Client của Google có đúng callback Supabase ở bước 1, gồm đúng project reference và `/auth/v1/callback`. |
| Supabase báo provider bị tắt hoặc cấu hình OAuth chưa hoàn tất | Google provider đã bật và Client ID, Client Secret đã được lưu ở đúng dự án Supabase. |
| Google báo ứng dụng đang Testing và từ chối truy cập | Gmail đăng nhập đã được thêm tại Google Auth Platform → Audience → Test users. |
| Đăng nhập quay lại lỗi hoặc sai đường dẫn local | Supabase URL Configuration có đúng callback ứng dụng `/auth/callback`; Site URL khớp origin ứng dụng. |
| Đăng nhập Google thành công nhưng hiện “chưa kích hoạt” | Gmail chưa có role được cấp trong ứng dụng, tài khoản bị vô hiệu hóa, hoặc Gmail đăng nhập khác với Gmail trong bootstrap. |
| Ứng dụng vẫn hiện người dùng hoặc dữ liệu giả | Đặt `NEXT_PUBLIC_USE_MOCK=false`, kiểm tra Supabase URL/key rồi khởi động lại dev server. |

## Lưu ý trước khi dùng tài khoản khách hàng

- Dùng Google Cloud và Supabase do khách hàng sở hữu; không dùng chung tài khoản chủ sở hữu của bên phát triển.
- Tạo OAuth web client riêng và khai báo redirect URL riêng cho từng môi trường.
- Giữ consent screen ở Testing đến khi chủ dự án sẵn sàng công khai và hoàn tất yêu cầu xác minh của Google nếu có.
- Gỡ role của nhân sự cũ trong ứng dụng và xóa khỏi danh sách test user nếu cần chấm dứt quyền truy cập.
- Cất Client Secret và database password trong trình quản lý mật khẩu. Nếu thông tin xác thực bị lộ, hãy xoay vòng ngay.
