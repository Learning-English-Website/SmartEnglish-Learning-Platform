import toast from 'react-hot-toast';

/**
 * useToast - hook for toast notifications
 */
export function useToast() {
  const success = (message) => toast.success(message);
  const error = (message) => toast.error(message);
  const loading = (message) => toast.loading(message);
  const promise = (promise, messages = {}) => {
    return toast.promise(promise, {
      loading: messages.loading || 'Đang tải...',
      success: messages.success || 'Thành công!',
      error: messages.error || 'Đã xảy ra lỗi',
    });
  };

  return { success, error, loading, promise };
}

export default useToast;
