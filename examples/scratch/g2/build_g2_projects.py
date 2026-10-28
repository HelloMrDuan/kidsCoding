"""Build the original G2-U1 Scratch 3 lesson projects and the sandbox lesson models.

Each lesson gets one editable .sb3 (original SVG artwork drawn for KidsCoding;
checked in base64-encoded as <name>.sb3.b64) and
one *lesson model*: the exact block skeleton plus the few parameters a learner may
change. The model is embedded in apps/web/public/scratch-g2-sandbox.html, so the
sandbox can reject any imported project that is not structurally this lesson.

Usage:
  python examples/scratch/g2/build_g2_projects.py          # check the checked-in files are current
  python examples/scratch/g2/build_g2_projects.py --write  # regenerate .sb3 files + embedded models

This builder/test proves structure only. Real execution is proven separately by
the Scratch VM browser E2E (apps/web/tests/e2e/scratch-g2-u1.spec.ts).
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import math
import re
import struct
import sys
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parents[2] / "apps" / "web"
SAMPLES = WEB / "public" / "scratch-samples"
SANDBOX = WEB / "public" / "scratch-g2-sandbox.html"
MODEL_START = '<script type="application/json" id="kc-g2-models">'
MODEL_END = "</script>"

STAGE_W, STAGE_H = 240, 180


def block(opcode, next=None, parent=None, inputs=None, fields=None, shadow=False, top=False, x=0, y=0):
    out = {"opcode": opcode, "next": next, "parent": parent, "inputs": inputs or {},
           "fields": fields or {}, "shadow": shadow, "topLevel": top}
    if top:
        out.update(x=x, y=y)
    return out


def num(value):
    return [1, [4, str(value)]]


def text(value):
    return [1, [10, str(value)]]


def svg_costume(name, filename, cx, cy):
    raw = (HERE / filename).read_bytes()
    digest = hashlib.md5(raw).hexdigest()
    return {"assetId": digest, "name": name, "md5ext": digest + ".svg", "dataFormat": "svg",
            "rotationCenterX": cx, "rotationCenterY": cy}, filename


def greet_scripts(prefix, x, y, greeting):
    """Green flag -> go to (x, y);  this sprite clicked -> say greeting for 2 secs."""
    return {
        f"{prefix}_flag": block("event_whenflagclicked", f"{prefix}_goto", top=True, x=40, y=40),
        f"{prefix}_goto": block("motion_gotoxy", parent=f"{prefix}_flag", inputs={"X": num(x), "Y": num(y)}),
        f"{prefix}_click": block("event_whenthisspriteclicked", f"{prefix}_say", top=True, x=40, y=200),
        f"{prefix}_say": block("looks_sayforsecs", parent=f"{prefix}_click",
                               inputs={"MESSAGE": text(greeting), "SECS": num(2)}),
    }


def sprite(name, costumes, blocks, layer, x, y, sounds=None, direction=90, rotation="all around"):
    return {"isStage": False, "name": name, "variables": {}, "lists": {}, "broadcasts": {}, "blocks": blocks,
            "comments": {}, "currentCostume": 0, "costumes": costumes, "sounds": sounds or [], "volume": 100,
            "layerOrder": layer, "visible": True, "x": x, "y": y, "size": 100, "direction": direction,
            "draggable": False, "rotationStyle": rotation}


def stage(costumes, blocks=None, sounds=None, broadcasts=None):
    return {"isStage": True, "name": "Stage", "variables": {}, "lists": {}, "broadcasts": broadcasts or {}, "blocks": blocks or {},
            "comments": {}, "currentCostume": 0, "costumes": costumes, "sounds": sounds or [], "volume": 100,
            "layerOrder": 0, "tempo": 60, "videoTransparency": 50, "videoState": "on",
            "textToSpeechLanguage": None}


def coordinate_params(target, prefix):
    return [
        {"target": target, "block": f"{prefix}_goto", "slot": "X", "kind": "int", "min": -STAGE_W, "max": STAGE_W},
        {"target": target, "block": f"{prefix}_goto", "slot": "Y", "kind": "int", "min": -STAGE_H, "max": STAGE_H},
        {"target": target, "block": f"{prefix}_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
    ]


def lesson_g2_u1_l01():
    """认识舞台与精灵: one backdrop (舞台) + two sprites, each with its own scripts."""
    backdrop, backdrop_file = svg_costume("春日公园", "park-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    bird, bird_file = svg_costume("小鸟", "blue-bird.svg", 32, 28)
    project = {
        "targets": [
            stage([backdrop]),
            sprite("小橘猫", [cat], greet_scripts("cat", -120, -80, "你好！我是小橘猫。"), 1, -120, -80),
            sprite("小鸟", [bird], greet_scripts("bird", -150, 110, "叽叽！我想回到鸟窝。"), 2, -150, 110),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L01"},
    }
    files = {backdrop["md5ext"]: backdrop_file, cat["md5ext"]: cat_file, bird["md5ext"]: bird_file}
    params = coordinate_params("小橘猫", "cat") + coordinate_params("小鸟", "bird")
    return "g2-u1-l01-park-friends.sb3.b64", project, files, params


def costume_scripts_cat():
    """Green flag -> switch to a chosen costume; clicked -> repeat N { next costume; wait }."""
    return {
        "cat_flag": block("event_whenflagclicked", "cat_switch", top=True, x=40, y=40),
        "cat_switch": block("looks_switchcostumeto", parent="cat_flag", inputs={"COSTUME": [1, "cat_costume_menu"]}),
        "cat_costume_menu": block("looks_costume", parent="cat_switch", fields={"COSTUME": ["站立", None]}, shadow=True),
        "cat_click": block("event_whenthisspriteclicked", "cat_repeat", top=True, x=40, y=200),
        "cat_repeat": block("control_repeat", parent="cat_click", inputs={"TIMES": num(1), "SUBSTACK": [2, "cat_next"]}),
        "cat_next": block("looks_nextcostume", "cat_wait", parent="cat_repeat"),
        "cat_wait": block("control_wait", parent="cat_next", inputs={"DURATION": num(0.5)}),
    }


def costume_scripts_bird():
    return {
        "bird_flag": block("event_whenflagclicked", "bird_switch", top=True, x=40, y=40),
        "bird_switch": block("looks_switchcostumeto", parent="bird_flag", inputs={"COSTUME": [1, "bird_costume_menu"]}),
        "bird_costume_menu": block("looks_costume", parent="bird_switch", fields={"COSTUME": ["收翅", None]}, shadow=True),
        "bird_click": block("event_whenthisspriteclicked", "bird_next", top=True, x=40, y=200),
        "bird_next": block("looks_nextcostume", parent="bird_click"),
    }


def lesson_g2_u1_l02():
    """角色换造型: one sprite owns several costumes; switch to one, or step through them."""
    backdrop, backdrop_file = svg_costume("演出舞台", "show-stage-backdrop.svg", 240, 180)
    cat_stand, cat_stand_file = svg_costume("站立", "orange-cat.svg", 48, 48)
    cat_wave, cat_wave_file = svg_costume("挥手", "orange-cat-wave.svg", 48, 48)
    bird_rest, bird_rest_file = svg_costume("收翅", "blue-bird.svg", 32, 28)
    bird_flap, bird_flap_file = svg_costume("展翅", "blue-bird-flap.svg", 32, 30)
    project = {
        "targets": [
            stage([backdrop]),
            sprite("小橘猫", [cat_stand, cat_wave], costume_scripts_cat(), 1, -60, -50),
            sprite("小鸟", [bird_rest, bird_flap], costume_scripts_bird(), 2, 120, 40),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L02"},
    }
    files = {c["md5ext"]: f for c, f in ((backdrop, backdrop_file), (cat_stand, cat_stand_file), (cat_wave, cat_wave_file),
                                         (bird_rest, bird_rest_file), (bird_flap, bird_flap_file))}
    params = [
        {"target": "小橘猫", "block": "cat_costume_menu", "slot": "COSTUME", "kind": "choice", "options": ["站立", "挥手"]},
        {"target": "小橘猫", "block": "cat_repeat", "slot": "TIMES", "kind": "int", "min": 1, "max": 10},
        {"target": "小橘猫", "block": "cat_wait", "slot": "DURATION", "kind": "tenths", "min": 0.2, "max": 1.0},
        {"target": "小鸟", "block": "bird_costume_menu", "slot": "COSTUME", "kind": "choice", "options": ["收翅", "展翅"]},
    ]
    return "g2-u1-l02-cat-costumes.sb3.b64", project, files, params


SOUND_RATE = 22050


def tone_wav(notes):
    """Deterministic original sound: a list of (freq_start, freq_end, seconds) chirps/tones,
    each with a soft attack/decay envelope, as 16-bit mono PCM WAV bytes."""
    frames = bytearray()
    count = 0
    for f0, f1, secs in notes:
        n = int(SOUND_RATE * secs)
        phase = 0.0
        for i in range(n):
            t = i / n
            freq = f0 + (f1 - f0) * t if f0 else 0.0
            phase += 2 * math.pi * freq / SOUND_RATE
            env = min(1.0, i / (SOUND_RATE * 0.005)) * (1 - t) ** 1.5
            value = 0.0 if not f0 else 0.45 * env * (math.sin(phase) + 0.3 * math.sin(2 * phase))
            frames += struct.pack("<h", int(max(-1.0, min(1.0, value)) * 32767))
            count += 1
    header = b"RIFF" + struct.pack("<I", 36 + len(frames)) + b"WAVEfmt " + struct.pack(
        "<IHHIIHH", 16, 1, 1, SOUND_RATE, SOUND_RATE * 2, 2, 16) + b"data" + struct.pack("<I", len(frames))
    return header + bytes(frames), count


def wav_sound(name, notes):
    data, samples = tone_wav(notes)
    digest = hashlib.md5(data).hexdigest()
    return {"assetId": digest, "name": name, "dataFormat": "wav", "format": "", "rate": SOUND_RATE,
            "sampleCount": samples, "md5ext": digest + ".wav"}, data


def lesson_g2_u1_l03():
    """设置背景和声音: the stage owns backdrops and its own sound; a sound inside a repeat plays again and again."""
    night, night_file = svg_costume("夜晚森林", "night-forest-backdrop.svg", 240, 180)
    meadow, meadow_file = svg_costume("绿色草地", "meadow-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    bird, bird_file = svg_costume("小鸟", "blue-bird.svg", 32, 28)
    bell, bell_data = wav_sound("开幕铃", [(880, 880, 0.35), (1320, 1320, 0.45)])
    chirp, chirp_data = wav_sound("叽叽", [(2200, 3200, 0.09), (0, 0, 0.05), (2200, 3200, 0.09)])
    tweet, tweet_data = wav_sound("啾啾", [(3400, 2000, 0.16), (0, 0, 0.04), (2600, 1800, 0.2)])
    stage_blocks = {
        "stage_flag": block("event_whenflagclicked", "stage_switch", top=True, x=40, y=40),
        "stage_switch": block("looks_switchbackdropto", "stage_repeat", parent="stage_flag", inputs={"BACKDROP": [1, "stage_backdrop_menu"]}),
        "stage_backdrop_menu": block("looks_backdrops", parent="stage_switch", fields={"BACKDROP": ["夜晚森林", None]}, shadow=True),
        "stage_repeat": block("control_repeat", parent="stage_switch", inputs={"TIMES": num(3), "SUBSTACK": [2, "stage_play"]}),
        "stage_play": block("sound_playuntildone", parent="stage_repeat", inputs={"SOUND_MENU": [1, "stage_sound_menu"]}),
        "stage_sound_menu": block("sound_sounds_menu", parent="stage_play", fields={"SOUND_MENU": ["开幕铃", None]}, shadow=True),
    }
    cat_blocks = {
        "cat_click": block("event_whenthisspriteclicked", "cat_say", top=True, x=40, y=40),
        "cat_say": block("looks_sayforsecs", parent="cat_click", inputs={"MESSAGE": text("欢迎来到森林音乐会！"), "SECS": num(2)}),
    }
    bird_blocks = {
        "bird_click": block("event_whenthisspriteclicked", "bird_play", top=True, x=40, y=40),
        "bird_play": block("sound_playuntildone", parent="bird_click", inputs={"SOUND_MENU": [1, "bird_sound_menu"]}),
        "bird_sound_menu": block("sound_sounds_menu", parent="bird_play", fields={"SOUND_MENU": ["叽叽", None]}, shadow=True),
    }
    project = {
        "targets": [
            stage([night, meadow], stage_blocks, [bell]),
            sprite("小橘猫", [cat], cat_blocks, 1, -150, -70),
            sprite("小鸟", [bird], bird_blocks, 2, 130, 60, [chirp, tweet]),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L03"},
    }
    files = {night["md5ext"]: night_file, meadow["md5ext"]: meadow_file, cat["md5ext"]: cat_file, bird["md5ext"]: bird_file,
             bell["md5ext"]: bell_data, chirp["md5ext"]: chirp_data, tweet["md5ext"]: tweet_data}
    params = [
        {"target": "Stage", "block": "stage_backdrop_menu", "slot": "BACKDROP", "kind": "choice", "options": ["夜晚森林", "绿色草地"]},
        {"target": "Stage", "block": "stage_repeat", "slot": "TIMES", "kind": "int", "min": 1, "max": 5},
        {"target": "小橘猫", "block": "cat_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "小鸟", "block": "bird_sound_menu", "slot": "SOUND_MENU", "kind": "choice", "options": ["叽叽", "啾啾"]},
    ]
    return "g2-u1-l03-forest-concert.sb3.b64", project, files, params


def angle(value):
    return [1, [8, str(value)]]


L04_CAT_START = (-100, -70)


def lesson_g2_u1_l04():
    """运动积木初体验: move N steps goes the way the sprite faces; turn right N degrees changes the direction."""
    river, river_file = svg_costume("小河边", "riverside-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    wheel, wheel_file = svg_costume("风车", "pinwheel.svg", 40, 40)
    cx, cy = L04_CAT_START
    cat_blocks = {
        "cat_flag": block("event_whenflagclicked", "cat_goto", top=True, x=40, y=40),
        "cat_goto": block("motion_gotoxy", "cat_point", parent="cat_flag", inputs={"X": num(cx), "Y": num(cy)}),
        # The bug the lesson starts with: the cat faces left (-90), so "move" walks away from the fish.
        "cat_point": block("motion_pointindirection", "cat_move", parent="cat_goto", inputs={"DIRECTION": angle(-90)}),
        "cat_move": block("motion_movesteps", "cat_say", parent="cat_point", inputs={"STEPS": num(100)}),
        "cat_say": block("looks_sayforsecs", parent="cat_move", inputs={"MESSAGE": text("我走到这里啦！"), "SECS": num(2)}),
    }
    wheel_blocks = {
        "wheel_click": block("event_whenthisspriteclicked", "wheel_repeat", top=True, x=40, y=40),
        "wheel_repeat": block("control_repeat", parent="wheel_click", inputs={"TIMES": num(1), "SUBSTACK": [2, "wheel_turn"]}),
        "wheel_turn": block("motion_turnright", "wheel_wait", parent="wheel_repeat", inputs={"DEGREES": num(15)}),
        "wheel_wait": block("control_wait", parent="wheel_turn", inputs={"DURATION": num(0.2)}),
    }
    project = {
        "targets": [
            stage([river]),
            sprite("小橘猫", [cat], cat_blocks, 1, cx, cy, direction=-90, rotation="left-right"),
            sprite("风车", [wheel], wheel_blocks, 2, 0, 82),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L04"},
    }
    files = {river["md5ext"]: river_file, cat["md5ext"]: cat_file, wheel["md5ext"]: wheel_file}
    params = [
        {"target": "小橘猫", "block": "cat_point", "slot": "DIRECTION", "kind": "choice", "options": ["90", "-90", "0", "180"]},
        {"target": "小橘猫", "block": "cat_move", "slot": "STEPS", "kind": "int", "min": 10, "max": 300},
        {"target": "小橘猫", "block": "cat_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "风车", "block": "wheel_repeat", "slot": "TIMES", "kind": "int", "min": 1, "max": 12},
        {"target": "风车", "block": "wheel_turn", "slot": "DEGREES", "kind": "int", "min": 1, "max": 180},
        {"target": "风车", "block": "wheel_wait", "slot": "DURATION", "kind": "tenths", "min": 0.2, "max": 1.0},
    ]
    return "g2-u1-l04-cat-walks.sb3.b64", project, files, params


MSG_OPEN, MSG_BOW = "kc-msg-open", "kc-msg-bow"


def broadcast_menu(name, msg_id):
    """Scratch serialises the broadcast menu shadow as a compact primitive [11, name, id]."""
    return [1, [11, name, msg_id]]


def lesson_g2_u1_l05():
    """广播第一条消息: one sprite broadcasts a message; every script that receives that exact message starts."""
    curtain, curtain_file = svg_costume("幕布舞台", "curtain-stage-backdrop.svg", 240, 180)
    lights, lights_file = svg_costume("灯光舞台", "show-stage-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    bird, bird_file = svg_costume("小鸟", "blue-bird.svg", 32, 28)
    rabbit, rabbit_file = svg_costume("小白兔", "white-rabbit.svg", 36, 48)
    stage_blocks = {
        "stage_flag": block("event_whenflagclicked", "stage_reset", top=True, x=40, y=40),
        "stage_reset": block("looks_switchbackdropto", parent="stage_flag", inputs={"BACKDROP": [1, "stage_reset_menu"]}),
        "stage_reset_menu": block("looks_backdrops", parent="stage_reset", fields={"BACKDROP": ["幕布舞台", None]}, shadow=True),
        "stage_recv": block("event_whenbroadcastreceived", "stage_switch", top=True, x=40, y=200, fields={"BROADCAST_OPTION": ["开场", MSG_OPEN]}),
        "stage_switch": block("looks_switchbackdropto", parent="stage_recv", inputs={"BACKDROP": [1, "stage_backdrop_menu"]}),
        "stage_backdrop_menu": block("looks_backdrops", parent="stage_switch", fields={"BACKDROP": ["幕布舞台", None]}, shadow=True),
    }
    cat_blocks = {
        "cat_click": block("event_whenthisspriteclicked", "cat_say", top=True, x=40, y=40),
        "cat_say": block("looks_sayforsecs", "cat_bcast", parent="cat_click", inputs={"MESSAGE": text("表演开始！"), "SECS": num(2)}),
        "cat_bcast": block("event_broadcast", parent="cat_say", inputs={"BROADCAST_INPUT": broadcast_menu("开场", MSG_OPEN)}),
    }
    bird_blocks = {
        # The bug the lesson starts with: the bird listens for 谢幕, but the cat broadcasts 开场.
        "bird_recv": block("event_whenbroadcastreceived", "bird_say", top=True, x=40, y=40, fields={"BROADCAST_OPTION": ["谢幕", MSG_BOW]}),
        "bird_say": block("looks_sayforsecs", parent="bird_recv", inputs={"MESSAGE": text("叽叽喳喳，欢迎大家！"), "SECS": num(2)}),
    }
    rabbit_blocks = {
        "rabbit_flag": block("event_whenflagclicked", "rabbit_home", top=True, x=40, y=40),
        "rabbit_home": block("motion_gotoxy", parent="rabbit_flag", inputs={"X": num(190), "Y": num(-40)}),
        "rabbit_recv": block("event_whenbroadcastreceived", "rabbit_goto", top=True, x=40, y=200, fields={"BROADCAST_OPTION": ["开场", MSG_OPEN]}),
        "rabbit_goto": block("motion_gotoxy", parent="rabbit_recv", inputs={"X": num(110), "Y": num(-40)}),
    }
    project = {
        "targets": [
            stage([curtain, lights], stage_blocks, broadcasts={MSG_OPEN: "开场", MSG_BOW: "谢幕"}),
            sprite("小橘猫", [cat], cat_blocks, 1, -160, -50),
            sprite("小鸟", [bird], bird_blocks, 2, 130, 75),
            sprite("小白兔", [rabbit], rabbit_blocks, 3, 190, -40),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L05"},
    }
    files = {c["md5ext"]: f for c, f in ((curtain, curtain_file), (lights, lights_file), (cat, cat_file), (bird, bird_file), (rabbit, rabbit_file))}
    params = [
        {"target": "Stage", "block": "stage_backdrop_menu", "slot": "BACKDROP", "kind": "choice", "options": ["幕布舞台", "灯光舞台"]},
        {"target": "小橘猫", "block": "cat_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "小鸟", "block": "bird_recv", "slot": "BROADCAST_OPTION", "kind": "choice", "options": ["开场", "谢幕"]},
        {"target": "小鸟", "block": "bird_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "小白兔", "block": "rabbit_goto", "slot": "X", "kind": "int", "min": -240, "max": 240},
    ]
    return "g2-u1-l05-broadcast-show.sb3.b64", project, files, params


# "Happy birthday" opening phrase as plain tones (C4 C4 D4 C4 F4 E4), synthesised here: original, no samples.
BIRTHDAY_TUNE = [(262, 262, 0.22), (262, 262, 0.18), (294, 294, 0.4), (262, 262, 0.4), (349, 349, 0.4), (330, 330, 0.7)]


def lesson_g2_u1_l06():
    """制作生日贺卡: put the lesson blocks together in time order; a wait lets characters take turns."""
    card, card_file = svg_costume("生日贺卡", "birthday-card-backdrop.svg", 240, 180)
    cat, cat_file = svg_costume("小橘猫", "orange-cat.svg", 48, 48)
    unlit, unlit_file = svg_costume("蜡烛熄灭", "cake-unlit.svg", 55, 50)
    lit, lit_file = svg_costume("蜡烛点亮", "cake-lit.svg", 55, 50)
    balloon, balloon_file = svg_costume("气球", "red-balloon.svg", 30, 40)
    song, song_data = wav_sound("生日歌", BIRTHDAY_TUNE)
    cat_blocks = {
        "cat_flag": block("event_whenflagclicked", "cat_say", top=True, x=40, y=40),
        "cat_say": block("looks_sayforsecs", parent="cat_flag", inputs={"MESSAGE": text("生日快乐！"), "SECS": num(2)}),
    }
    cake_blocks = {
        "cake_flag": block("event_whenflagclicked", "cake_reset", top=True, x=40, y=40),
        "cake_reset": block("looks_switchcostumeto", parent="cake_flag", inputs={"COSTUME": [1, "cake_reset_menu"]}),
        "cake_reset_menu": block("looks_costume", parent="cake_reset", fields={"COSTUME": ["蜡烛熄灭", None]}, shadow=True),
        "cake_click": block("event_whenthisspriteclicked", "cake_switch", top=True, x=40, y=200),
        "cake_switch": block("looks_switchcostumeto", "cake_play", parent="cake_click", inputs={"COSTUME": [1, "cake_costume_menu"]}),
        "cake_costume_menu": block("looks_costume", parent="cake_switch", fields={"COSTUME": ["蜡烛熄灭", None]}, shadow=True),
        "cake_play": block("sound_playuntildone", parent="cake_switch", inputs={"SOUND_MENU": [1, "cake_sound_menu"]}),
        "cake_sound_menu": block("sound_sounds_menu", parent="cake_play", fields={"SOUND_MENU": ["生日歌", None]}, shadow=True),
    }
    balloon_blocks = {
        "balloon_flag": block("event_whenflagclicked", "balloon_home", top=True, x=40, y=40),
        "balloon_home": block("motion_gotoxy", "balloon_wait", parent="balloon_flag", inputs={"X": num(160), "Y": num(-90)}),
        # The bug the lesson starts with: no wait, so the balloon talks over the cat's greeting.
        "balloon_wait": block("control_wait", "balloon_say", parent="balloon_home", inputs={"DURATION": num(0)}),
        "balloon_say": block("looks_sayforsecs", "balloon_repeat", parent="balloon_wait", inputs={"MESSAGE": text("许个愿吧！"), "SECS": num(2)}),
        "balloon_repeat": block("control_repeat", parent="balloon_say", inputs={"TIMES": num(2), "SUBSTACK": [2, "balloon_rise"]}),
        "balloon_rise": block("motion_changeyby", parent="balloon_repeat", inputs={"DY": num(10)}),
    }
    project = {
        "targets": [
            stage([card]),
            sprite("小橘猫", [cat], cat_blocks, 1, -150, -60),
            sprite("蛋糕", [unlit, lit], cake_blocks, 2, 20, -75, [song]),
            sprite("气球", [balloon], balloon_blocks, 3, 160, -90),
        ],
        "monitors": [], "extensions": [],
        "meta": {"semver": "3.0.0", "vm": "0.2.0", "agent": "KidsCoding G2-U1-L06"},
    }
    files = {c["md5ext"]: f for c, f in ((card, card_file), (cat, cat_file), (unlit, unlit_file), (lit, lit_file), (balloon, balloon_file))}
    files[song["md5ext"]] = song_data
    params = [
        {"target": "小橘猫", "block": "cat_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "蛋糕", "block": "cake_costume_menu", "slot": "COSTUME", "kind": "choice", "options": ["蜡烛熄灭", "蜡烛点亮"]},
        {"target": "气球", "block": "balloon_wait", "slot": "DURATION", "kind": "int", "min": 0, "max": 5},
        {"target": "气球", "block": "balloon_say", "slot": "MESSAGE", "kind": "text", "maxLength": 20},
        {"target": "气球", "block": "balloon_repeat", "slot": "TIMES", "kind": "int", "min": 1, "max": 10},
        {"target": "气球", "block": "balloon_rise", "slot": "DY", "kind": "int", "min": 1, "max": 30},
    ]
    return "g2-u1-l06-birthday-card.sb3.b64", project, files, params


LESSONS = {
    "G2-U1-L01": lesson_g2_u1_l01,
    "G2-U1-L02": lesson_g2_u1_l02,
    "G2-U1-L03": lesson_g2_u1_l03,
    "G2-U1-L04": lesson_g2_u1_l04,
    "G2-U1-L05": lesson_g2_u1_l05,
    "G2-U1-L06": lesson_g2_u1_l06,
}


def model_for(project, params):
    def strip(blocks):
        return {bid: {k: b[k] for k in ("opcode", "next", "parent", "inputs", "fields", "shadow", "topLevel")}
                for bid, b in blocks.items()}
    targets = project["targets"]
    return {
        "stage": {"costumes": [c["name"] for c in targets[0]["costumes"]],
                  "sounds": [s["name"] for s in targets[0]["sounds"]], "blocks": strip(targets[0]["blocks"]),
                  **({"broadcasts": sorted(targets[0]["broadcasts"].values())} if targets[0]["broadcasts"] else {})},
        "sprites": [{"name": t["name"], "costumes": [c["name"] for c in t["costumes"]],
                     "sounds": [s["name"] for s in t["sounds"]], "blocks": strip(t["blocks"])}
                    for t in targets[1:]],
        "params": params,
    }


def build_models():
    models = {}
    for lesson_id, builder in LESSONS.items():
        _, project, _, params = builder()
        models[lesson_id] = model_for(project, params)
    return models


def sb3_text(project, files) -> str:
    """The checked-in sample is the genuine .sb3 zip, base64-encoded so it can be
    committed through text-only tooling; the lab decodes it back to the same bytes."""
    return base64.b64encode(sb3_bytes(project, files)).decode("ascii") + "\n"


def read_sample(filename) -> bytes:
    return base64.b64decode((SAMPLES / filename).read_text(encoding="ascii"))


def sb3_bytes(project, files) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        info = zipfile.ZipInfo("project.json", date_time=(2026, 10, 27, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, json.dumps(project, ensure_ascii=False))
        for target_name, source in sorted(files.items()):
            info = zipfile.ZipInfo(target_name, date_time=(2026, 10, 27, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, source if isinstance(source, bytes) else (HERE / source).read_bytes())
    return buffer.getvalue()


def project_for(lesson_id):
    return LESSONS[lesson_id]()[1]


def models_json() -> str:
    return json.dumps(build_models(), ensure_ascii=False, sort_keys=True)


def embedded_models(html: str) -> str:
    match = re.search(re.escape(MODEL_START) + r"(.*?)" + re.escape(MODEL_END), html, re.S)
    if not match:
        raise ValueError("sandbox has no embedded kc-g2-models block")
    return match.group(1).strip()


def write_all():
    SAMPLES.mkdir(parents=True, exist_ok=True)
    for builder in LESSONS.values():
        filename, project, files, _ = builder()
        (SAMPLES / filename).write_text(sb3_text(project, files), encoding="ascii")
    html = SANDBOX.read_text(encoding="utf-8")
    current = embedded_models(html)
    SANDBOX.write_text(html.replace(current, models_json(), 1), encoding="utf-8")


def check_all() -> list[str]:
    problems = []
    for lesson_id, builder in LESSONS.items():
        filename, project, files, _ = builder()
        path = SAMPLES / filename
        if not path.exists() or path.read_text(encoding="ascii") != sb3_text(project, files):
            problems.append(f"{lesson_id}: {filename} is stale; run with --write")
    if embedded_models(SANDBOX.read_text(encoding="utf-8")) != models_json():
        problems.append("scratch-g2-sandbox.html embedded models are stale; run with --write")
    return problems


if __name__ == "__main__":
    if "--write" in sys.argv:
        write_all()
    issues = check_all()
    for issue in issues:
        print(issue)
    sys.exit(1 if issues else 0)
