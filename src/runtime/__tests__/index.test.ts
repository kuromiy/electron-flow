describe('Runtime Index', () => {
  it('全てのエクスポートが利用可能である', () => {
    const runtime = require('../index');
    
    // 型エクスポートは実行時には存在しないが、関数は確認できる
    expect(typeof runtime.success).toBe('function');
    expect(typeof runtime.failure).toBe('function');
    expect(typeof runtime.isSuccess).toBe('function');
    expect(typeof runtime.isFailure).toBe('function');
  });

  it('success関数が正しく動作する', () => {
    const { success } = require('../index');
    const result = success('test');
    
    expect(result._tag).toBe('success');
    expect(result.value).toBe('test');
  });

  it('failure関数が正しく動作する', () => {
    const { failure } = require('../index');
    const result = failure([{ path: 'test', message: 'エラー' }]);
    
    expect(result._tag).toBe('failure');
    expect(result.value).toEqual([{ path: 'test', message: 'エラー' }]);
  });

  it('isSuccess関数が正しく動作する', () => {
    const { success, failure, isSuccess } = require('../index');
    
    expect(isSuccess(success('test'))).toBe(true);
    expect(isSuccess(failure([]))).toBe(false);
  });

  it('isFailure関数が正しく動作する', () => {
    const { success, failure, isFailure } = require('../index');
    
    expect(isFailure(failure([]))).toBe(true);
    expect(isFailure(success('test'))).toBe(false);
  });
});