import json
import unittest

from source_label_executor import LabelError, correct_program, run_program


def img(iid, author, source, permission="allowed"):
    return {"type": "image", "id": iid, "author": author,
            "source": source, "permission": permission}


def base(images):
    return [{"type": "when_start"}] + images


class TestS0U3L02(unittest.TestCase):
    def test_correct_labels(self):
        r = run_program(correct_program())
        self.assertEqual(r["status"], "success")
        self.assertEqual(r["images"], ["pic1", "pic2", "pic3"])

    def test_practice_b_different_images(self):
        r = run_program(base([
            img("pic1", "小兔", "学校图库"),
            img("pic2", "小狐", "自己创作"),
            img("pic3", "小鸟", "公共图库"),
        ]))
        self.assertEqual(r["status"], "success")

    def test_missing_author_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "", "学校图库"),
                img("pic2", "小梅", "家庭相册"),
                img("pic3", "小刚", "自己创作"),
            ]))

    def test_missing_source_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "小林", ""),
                img("pic2", "小梅", "家庭相册"),
                img("pic3", "小刚", "自己创作"),
            ]))

    def test_unknown_permission_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "小林", "学校图库", permission="unknown"),
                img("pic2", "小梅", "家庭相册"),
                img("pic3", "小刚", "自己创作"),
            ]))

    def test_not_allowed_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "小林", "学校图库", permission="not_allowed"),
                img("pic2", "小梅", "家庭相册"),
                img("pic3", "小刚", "自己创作"),
            ]))

    def test_duplicate_id_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "小林", "学校图库"),
                img("pic1", "小林", "学校图库"),
                img("pic3", "小刚", "自己创作"),
            ]))

    def test_only_two_images_fails(self):
        with self.assertRaises(LabelError):
            run_program(base([
                img("pic1", "小林", "学校图库"),
                img("pic2", "小梅", "家庭相册"),
            ]))

    def test_extension_fourth_image_passes(self):
        r = run_program(correct_program() + [
            img("pic4", "小兔", "公共图库")])
        self.assertEqual(len(r["images"]), 4)

    def test_save_reopen_reruns_identically(self):
        p = correct_program()
        first = run_program(p)
        reopened = json.loads(json.dumps(p))
        self.assertEqual(run_program(reopened), first)

    def test_missing_start_fails(self):
        with self.assertRaises(LabelError):
            run_program(correct_program()[1:])


if __name__ == "__main__":
    unittest.main()
