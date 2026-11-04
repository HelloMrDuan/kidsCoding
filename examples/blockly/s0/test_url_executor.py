import json
import unittest

from url_executor import UrlError, correct_program, run_program


def check(url, verdict):
    return {"type": "check", "url": url, "verdict": verdict}


def base(checks):
    return [{"type": "when_start"}] + checks


class TestS0U1L05(unittest.TestCase):
    def test_correct_judgements(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(len(r["checks"]), 4)

    def test_practice_b_different_urls(self):
        r = run_program(base([
            check("https://library.school.edu.cn", "reliable"),
            check("https://www.gov.cn", "reliable"),
            check("http://www.school.edu.cn", "unreliable"),
            check("https://free-gift.com", "unreliable"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_wrong_verdict_fails(self):
        with self.assertRaises(UrlError):
            run_program(base([
                check("https://www.school.edu.cn", "unreliable"),
                check("https://news.gov.cn", "reliable"),
                check("http://free-prize.xyz", "unreliable"),
                check("https://school-login-free.com", "unreliable"),
            ]))

    def test_http_trusted_domain_fails_if_called_reliable(self):
        with self.assertRaises(UrlError):
            run_program(base([
                check("https://www.school.edu.cn", "reliable"),
                check("https://news.gov.cn", "reliable"),
                check("http://www.school.edu.cn", "reliable"),
                check("http://free-prize.xyz", "unreliable"),
            ]))

    def test_only_reliable_fails(self):
        with self.assertRaises(UrlError):
            run_program(base([
                check("https://www.school.edu.cn", "reliable"),
                check("https://news.gov.cn", "reliable"),
                check("https://library.school.edu.cn", "reliable"),
                check("https://www.gov.cn", "reliable"),
            ]))

    def test_duplicate_url_fails(self):
        with self.assertRaises(UrlError):
            run_program(base([
                check("https://www.school.edu.cn", "reliable"),
                check("https://www.school.edu.cn", "reliable"),
                check("https://news.gov.cn", "reliable"),
                check("http://free-prize.xyz", "unreliable"),
            ]))

    def test_too_few_checks_fails(self):
        with self.assertRaises(UrlError):
            run_program(base([
                check("https://www.school.edu.cn", "reliable"),
                check("http://free-prize.xyz", "unreliable"),
            ]))

    def test_extension_unknown_url_passes(self):
        r = run_program(correct_program() + [
            check("https://unknown-site.com", "unreliable")])
        self.assertEqual(len(r["checks"]), 5)

    def test_save_reopen_reruns_identically(self):
        prog = correct_program()
        first = run_program(prog)
        reopened = json.loads(json.dumps(prog))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(UrlError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
