import asyncio
import contextlib
import inspect
import io
import json
import sys
import time
import traceback
from typing import Any


def normalize(value: Any) -> Any:
    if isinstance(value, tuple):
        return [normalize(item) for item in value]
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, set):
        return sorted(
            [normalize(item) for item in value],
            key=lambda item: json.dumps(item, ensure_ascii=False, sort_keys=True, default=str)
        )
    if isinstance(value, dict):
        return {str(key): normalize(val) for key, val in value.items()}
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return repr(value)


def to_error_message(error: BaseException) -> str:
    text = ''.join(traceback.format_exception_only(type(error), error)).strip()
    return text or str(error) or error.__class__.__name__


def call_solve(solve, args):
    if inspect.iscoroutinefunction(solve):
        return asyncio.run(solve(*args))

    result = solve(*args)
    if inspect.isawaitable(result):
        return asyncio.run(result)
    return result


def main():
    start = time.perf_counter()
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    try:
      payload = json.loads(sys.stdin.read() or '{}')
    except Exception as error:
      print(json.dumps({
          "passed": False,
          "error": to_error_message(error),
          "tests": [],
          "logs": [],
          "durationMs": 0
      }, ensure_ascii=False))
      return

    user_code = str(payload.get('userCode', ''))
    task = payload.get('task') or {}
    tests = task.get('tests') or []
    namespace = {'__name__': '__main__'}

    try:
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            exec(compile(user_code, '<user-code>', 'exec'), namespace, namespace)
    except Exception as error:
        logs = []
        stdout_text = stdout_buffer.getvalue().strip()
        stderr_text = stderr_buffer.getvalue().strip()
        if stdout_text:
            logs.append({"type": "stdout", "text": stdout_text})
        if stderr_text:
            logs.append({"type": "stderr", "text": stderr_text})
        print(json.dumps({
            "passed": False,
            "error": to_error_message(error),
            "tests": [],
            "logs": logs,
            "durationMs": int((time.perf_counter() - start) * 1000)
        }, ensure_ascii=False))
        return

    solve = namespace.get('solve') or namespace.get('main')
    if not callable(solve):
        logs = []
        stdout_text = stdout_buffer.getvalue().strip()
        stderr_text = stderr_buffer.getvalue().strip()
        if stdout_text:
            logs.append({"type": "stdout", "text": stdout_text})
        if stderr_text:
            logs.append({"type": "stderr", "text": stderr_text})
        print(json.dumps({
            "passed": False,
            "error": 'Нужно определить функцию solve(...) или main(...).',
            "tests": [],
            "logs": logs,
            "durationMs": int((time.perf_counter() - start) * 1000)
        }, ensure_ascii=False))
        return

    results = []
    passed = True
    first_error = None

    for test in tests:
        args = test.get('args') or []
        expected = test.get('expected')
        try:
            with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
                actual = call_solve(solve, args)
            actual_normalized = normalize(actual)
            expected_normalized = normalize(expected)
            test_passed = actual_normalized == expected_normalized
            if not test_passed:
                passed = False
                if first_error is None:
                    first_error = f'Ожидалось {expected_normalized!r}, получено {actual_normalized!r}.'
            results.append({
                "passed": test_passed,
                "expected": expected_normalized,
                "actual": actual_normalized,
                "error": None if test_passed else f'Ожидалось {expected_normalized!r}, получено {actual_normalized!r}.'
            })
        except Exception as error:
            passed = False
            message = to_error_message(error)
            if first_error is None:
                first_error = message
            results.append({
                "passed": False,
                "expected": normalize(expected),
                "actual": None,
                "error": message
            })

    logs = []
    stdout_text = stdout_buffer.getvalue().strip()
    stderr_text = stderr_buffer.getvalue().strip()
    if stdout_text:
        logs.append({"type": "stdout", "text": stdout_text})
    if stderr_text:
        logs.append({"type": "stderr", "text": stderr_text})

    print(json.dumps({
        "passed": passed,
        "error": None if passed else (first_error or 'Тест не пройден'),
        "tests": results,
        "logs": logs,
        "durationMs": int((time.perf_counter() - start) * 1000)
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
