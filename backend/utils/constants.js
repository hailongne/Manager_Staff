/**
 * HTTP Constants
 * Standard HTTP status codes and messages
 */

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: 'Không có quyền truy cập',
  INVALID_CREDENTIALS: 'Thông tin đăng nhập không chính xác',
  TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn',
  TOKEN_INVALID: 'Token không hợp lệ',
  
  // User
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  EMAIL_EXISTS: 'Email đã tồn tại',
  USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại',
  INVALID_USER_ID: 'ID người dùng không hợp lệ',
  
  // Department
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy phòng ban',
  DEPARTMENT_HAS_MEMBERS: 'Không thể xóa phòng ban có nhân viên',
  
  // Task
  TASK_NOT_FOUND: 'Không tìm thấy công việc',
  
  // Leave
  LEAVE_REQUEST_NOT_FOUND: 'Không tìm thấy đơn nghỉ phép',
  INSUFFICIENT_LEAVE_BALANCE: 'Số ngày phép còn lại không đủ',
  
  // Chain
  CHAIN_NOT_FOUND: 'Không tìm thấy dây chuyền',
  ASSIGNMENT_NOT_FOUND: 'Không tìm thấy phân công',
  KPI_NOT_FOUND: 'Không tìm thấy KPI',
  
  // General
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  SERVER_ERROR: 'Lỗi hệ thống',
  NOT_FOUND: 'Không tìm thấy tài nguyên',
  FORBIDDEN: 'Không có quyền thực hiện thao tác này',
  REQUIRED_FIELD: 'Thiếu trường bắt buộc'
};

const SUCCESS_MESSAGES = {
  CREATED: 'Tạo thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xóa thành công',
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công'
};

module.exports = {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
