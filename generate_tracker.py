#!/usr/bin/env python3
"""Generate an empty Daily Focus Tracker PDF."""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Register Bengali font
BENGALI_FONT = "/usr/share/fonts/truetype/noto/NotoSansBengali-Regular.ttf"
BENGALI_FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSansBengali-Bold.ttf"
pdfmetrics.registerFont(TTFont("NotoBengali", BENGALI_FONT))
pdfmetrics.registerFont(TTFont("NotoBengali-Bold", BENGALI_FONT_BOLD))

# Page layout
PAGE_W, PAGE_H = A4
MARGIN = 12 * mm
CONTENT_W = PAGE_W - 2 * MARGIN
CONTENT_H = PAGE_H - 2 * MARGIN
GAP = 4 * mm

# Color palette
GREEN = colors.HexColor("#2E7D32")
GREEN_LIGHT = colors.HexColor("#E8F5E9")
NAVY = colors.HexColor("#1A237E")
NAVY_LIGHT = colors.HexColor("#E8EAF6")
PURPLE = colors.HexColor("#6A1B9A")
PURPLE_LIGHT = colors.HexColor("#F3E5F5")
PINK = colors.HexColor("#C2185B")
PINK_LIGHT = colors.HexColor("#FCE4EC")
BLUE = colors.HexColor("#1565C0")
BLUE_LIGHT = colors.HexColor("#E3F2FD")
TITLE_BLUE = colors.HexColor("#1565C0")
LINE_GRAY = colors.HexColor("#BDBDBD")
TEXT_DARK = colors.HexColor("#212121")


def draw_rounded_rect(c, x, y, w, h, r=4, fill=None, stroke=None, stroke_width=0.5):
    """Draw a rounded rectangle (y is bottom-left)."""
    c.saveState()
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
    c.roundRect(x, y, w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)
    c.restoreState()


def draw_section_header(c, x, y, w, h, title, bg_color, text_color=colors.white, font_size=8, bengali=False):
    """Draw a colored section header bar."""
    draw_rounded_rect(c, x, y, w, h, r=3, fill=bg_color)
    c.setFillColor(text_color)
    font = "NotoBengali-Bold" if bengali else "Helvetica-Bold"
    c.setFont(font, font_size)
    c.drawCentredString(x + w / 2, y + h / 2 - font_size / 3, title)


def draw_blank_line(c, x, y, length, thickness=0.5):
    """Draw a horizontal fill-in line."""
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(thickness)
    c.line(x, y, x + length, y)


def draw_checkbox(c, x, y, size=8):
    """Draw an empty checkbox."""
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.8)
    c.rect(x, y, size, size, fill=0, stroke=1)


def draw_radio(c, x, y, radius=4):
    """Draw an empty radio button circle."""
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.8)
    c.circle(x + radius, y + radius, radius, fill=0, stroke=1)


def draw_bengali(c, x, y, text, size=7, bold=False):
    """Draw Bengali text."""
    font = "NotoBengali-Bold" if bold else "NotoBengali"
    c.setFont(font, size)
    c.setFillColor(TEXT_DARK)
    c.drawString(x, y, text)


def draw_header(c):
    """Draw page header with day, title, name, and date fields."""
    top = PAGE_H - MARGIN
    header_h = 22 * mm

    # Day badge (top left)
    day_x = MARGIN
    day_y = top - 10 * mm
    c.setFillColor(colors.HexColor("#FFF9C4"))
    c.circle(day_x + 4 * mm, day_y + 2 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#F9A825"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(day_x + 8 * mm, day_y, "Day")
    draw_blank_line(c, day_x + 18 * mm, day_y, 12 * mm)

    # Title (center)
    c.setFillColor(TITLE_BLUE)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(PAGE_W / 2, top - 8 * mm, "DAILY FOCUS TRACKER")

    # Decorative line under title
    line_w = 60 * mm
    line_x = (PAGE_W - line_w) / 2
    line_y = top - 12 * mm
    c.setStrokeColor(TITLE_BLUE)
    c.setLineWidth(0.8)
    c.line(line_x, line_y, line_x + line_w, line_y)
    c.circle(PAGE_W / 2, line_y, 1.5, fill=1, stroke=0)

    # Target icon (top right) - simple bullseye
    target_x = PAGE_W - MARGIN - 8 * mm
    target_y = top - 9 * mm
    for r, col in [(5, colors.HexColor("#E53935")), (3.5, colors.white), (2, colors.HexColor("#E53935"))]:
        c.setFillColor(col)
        c.circle(target_x, target_y, r, fill=1, stroke=0)

    # Name and date fields
    field_y = top - 18 * mm
    draw_bengali(c, MARGIN, field_y, "নাম:", size=8)
    draw_blank_line(c, MARGIN + 14 * mm, field_y, 55 * mm)

    draw_bengali(c, MARGIN + 75 * mm, field_y, "তারিখ:", size=8)
    date_x = MARGIN + 92 * mm
    box_w = 10 * mm
    box_h = 5 * mm
    for i in range(3):
        bx = date_x + i * (box_w + 4 * mm)
        draw_rounded_rect(c, bx, field_y - 1.5 * mm, box_w, box_h, r=2, stroke=LINE_GRAY)
        if i < 2:
            c.setFillColor(TEXT_DARK)
            c.setFont("Helvetica", 8)
            c.drawString(bx + box_w + 1 * mm, field_y, "/")

    return top - header_h


def draw_mits_section(c, x, y, w, h):
    """Today's 4 MITs section."""
    header_h = 7 * mm
    draw_section_header(
        c, x, y + h - header_h, w, header_h,
        "আজকের ৪টি সবচেয়ে গুরুত্বপূর্ণ কাজ (MITs)",
        GREEN, font_size=7, bengali=True,
    )
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=GREEN_LIGHT, stroke=GREEN, stroke_width=0.5)

    body_y = y + h - header_h - 4 * mm
    row_h = (h - header_h - 8 * mm) / 4

    for i in range(4):
        row_y = body_y - (i + 1) * row_h + row_h / 2
        # Number circle
        cx = x + 6 * mm
        cy = row_y
        c.setFillColor(GREEN)
        c.circle(cx, cy, 3.5 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx, cy - 2.5, str(i + 1))

        # Small icon placeholder
        c.setFillColor(colors.HexColor("#FFC107"))
        c.circle(x + 14 * mm, cy, 2 * mm, fill=1, stroke=0)

        # Blank task line
        draw_blank_line(c, x + 20 * mm, row_y - 1 * mm, w - 24 * mm)


def draw_deep_work_section(c, x, y, w, h):
    """Deep Work Sessions table."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "DEEP WORK SESSIONS", NAVY)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=NAVY_LIGHT, stroke=NAVY, stroke_width=0.5)

    table_top = y + h - header_h - 3 * mm
    table_h = h - header_h - 10 * mm
    col_widths = [0.12, 0.35, 0.17, 0.17, 0.19]
    col_labels = ["Session", "কাজ", "শুরু", "শেষ", "মোট সময়"]

    # Column headers
    col_x = x + 2 * mm
    header_row_y = table_top - 4 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 6)
    for label, frac in zip(col_labels, col_widths):
        cw = (w - 4 * mm) * frac
        if label in ("কাজ", "শুরু", "শেষ", "মোট সময়"):
            draw_bengali(c, col_x + 1 * mm, header_row_y, label, size=6, bold=True)
        else:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 6)
            c.drawString(col_x + 1 * mm, header_row_y, label)
        col_x += cw

    # Data rows
    row_h = (table_h - 6 * mm) / 4
    for row in range(4):
        row_y = header_row_y - (row + 1) * row_h - 2 * mm
        col_x = x + 2 * mm
        for col_idx, frac in enumerate(col_widths):
            cw = (w - 4 * mm) * frac
            if col_idx == 0:
                c.setFillColor(NAVY)
                c.setFont("Helvetica-Bold", 7)
                c.drawCentredString(col_x + cw / 2, row_y, str(row + 1))
            else:
                draw_blank_line(c, col_x + 1 * mm, row_y, cw - 2 * mm, thickness=0.4)
            col_x += cw

    # Footer total
    footer_y = y + 3 * mm
    draw_bengali(c, x + 3 * mm, footer_y, "মোট Deep Work:", size=7)
    draw_blank_line(c, x + 32 * mm, footer_y, 15 * mm)
    c.setFont("Helvetica", 7)
    c.setFillColor(TEXT_DARK)
    c.drawString(x + 49 * mm, footer_y, "মিনিট")


def draw_distraction_section(c, x, y, w, h):
    """Distraction Tracker table."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "DISTRACTION TRACKER", PURPLE)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=PURPLE_LIGHT, stroke=PURPLE, stroke_width=0.5)

    table_top = y + h - header_h - 3 * mm
    col1_w = w * 0.65
    col2_w = w * 0.35

    # Headers
    header_y = table_top - 4 * mm
    draw_bengali(c, x + 3 * mm, header_y, "বিভ্রান্তির ধরন", size=6, bold=True)
    draw_bengali(c, x + col1_w + 3 * mm, header_y, "কতবার", size=6, bold=True)

    rows = ["Facebook / Reels", "YouTube / Shorts", "Unnecessary Browsing", "Other"]
    row_h = (h - header_h - 12 * mm) / 4
    for i, label in enumerate(rows):
        row_y = header_y - (i + 1) * row_h - 2 * mm
        c.setFont("Helvetica", 7)
        c.setFillColor(TEXT_DARK)
        c.drawString(x + 3 * mm, row_y, label)
        draw_blank_line(c, x + col1_w + 3 * mm, row_y, col2_w - 8 * mm, thickness=0.4)

    footer_y = y + 3 * mm
    draw_bengali(c, x + 3 * mm, footer_y, "আজ মোট Distraction:", size=7)
    draw_blank_line(c, x + 38 * mm, footer_y, 12 * mm)
    draw_bengali(c, x + 52 * mm, footer_y, "বার", size=7)


def draw_brain_energy_section(c, x, y, w, h):
    """Brain Energy Check with radio options."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "BRAIN ENERGY CHECK", PINK)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=PINK_LIGHT, stroke=PINK, stroke_width=0.5)

    options = [
        "খুব কম (1/5)",
        "কম (2/5)",
        "মাঝারি (3/5)",
        "ভালো (4/5)",
        "চমৎকার (5/5)",
    ]

    list_x = x + 4 * mm
    start_y = y + h - header_h - 8 * mm
    row_h = (h - header_h - 12 * mm) / 5

    for i, opt in enumerate(options):
        opt_y = start_y - i * row_h
        draw_radio(c, list_x, opt_y - 2, radius=3.5)
        draw_bengali(c, list_x + 10 * mm, opt_y, opt, size=7)

    # Simple brain icon (right side)
    brain_x = x + w - 22 * mm
    brain_y = y + (h - header_h) / 2 - 5 * mm
    c.setFillColor(PINK)
    c.setStrokeColor(PINK)
    c.setLineWidth(1)
    # Brain shape approximation
    c.ellipse(brain_x, brain_y, brain_x + 16 * mm, brain_y + 14 * mm, fill=1, stroke=1)
    # Smiley face
    c.setFillColor(colors.white)
    c.circle(brain_x + 5 * mm, brain_y + 8 * mm, 1.2 * mm, fill=1, stroke=0)
    c.circle(brain_x + 11 * mm, brain_y + 8 * mm, 1.2 * mm, fill=1, stroke=0)
    c.setStrokeColor(colors.white)
    c.setLineWidth(0.6)
    c.arc(brain_x + 5 * mm, brain_y + 4 * mm, brain_x + 11 * mm, brain_y + 7 * mm, startAng=200, extent=140)


def draw_neuroscience_habits(c, x, y, w, h):
    """Neuroscience Habits horizontal row."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "NEUROSCIENCE HABITS", BLUE)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=BLUE_LIGHT, stroke=BLUE, stroke_width=0.5)

    habits = [
        "সকালে 10-15 মিনিট\nসূর্যের আলো",
        "20+ মিনিট\nহাঁটা/ব্যায়াম",
        "পর্যাপ্ত\nপানি পান",
        "ঘুমানোর 1 ঘণ্টা\nআগে ফোন বন্ধ",
        "7-9 ঘণ্টা\nঘুম",
    ]
    icons = ["☀", "🚶", "💧", "📵", "🌙"]

    box_w = (w - 6 * mm) / 5
    box_h = h - header_h - 10 * mm
    start_x = x + 3 * mm
    box_y = y + 5 * mm

    for i, (habit, icon) in enumerate(zip(habits, icons)):
        bx = start_x + i * box_w
        draw_rounded_rect(c, bx, box_y, box_w - 2 * mm, box_h, r=3, fill=colors.white, stroke=LINE_GRAY)

        # Icon area
        c.setFont("Helvetica", 12)
        c.setFillColor(BLUE)
        c.drawCentredString(bx + (box_w - 2 * mm) / 2, box_y + box_h - 10 * mm, icon)

        # Bengali text (multi-line)
        lines = habit.split("\n")
        text_y = box_y + box_h - 18 * mm
        for line in lines:
            draw_bengali(c, bx + 2 * mm, text_y, line, size=5.5)
            text_y -= 3.5 * mm

        # Checkbox at bottom
        draw_checkbox(c, bx + (box_w - 2 * mm) / 2 - 4, box_y + 3 * mm, size=8)

    # Score footer
    score_y = y + 1.5 * mm
    draw_bengali(c, x + w / 2 - 18 * mm, score_y, "স্কোর:", size=7)
    draw_blank_line(c, x + w / 2 - 8 * mm, score_y, 8 * mm)
    c.setFont("Helvetica", 7)
    c.setFillColor(TEXT_DARK)
    c.drawString(x + w / 2 + 2 * mm, score_y, "/ 5")


def draw_reflection_section(c, x, y, w, h):
    """Daily Reflection prompts."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "DAILY REFLECTION", PINK)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=PINK_LIGHT, stroke=PINK, stroke_width=0.5)

    prompts = [
        "আজ কী ভালো হয়েছে?",
        "আগামীকাল কী উন্নতি করবো?",
    ]

    body_h = h - header_h - 4 * mm
    prompt_h = body_h / 2
    for i, prompt in enumerate(prompts):
        py = y + body_h - (i + 1) * prompt_h + 4 * mm
        draw_bengali(c, x + 3 * mm, py + prompt_h - 8 * mm, prompt, size=7, bold=True)
        line_spacing = 5 * mm
        for j in range(3):
            line_y = py + prompt_h - 14 * mm - j * line_spacing
            draw_blank_line(c, x + 3 * mm, line_y, w - 6 * mm, thickness=0.4)


def draw_focus_score_section(c, x, y, w, h):
    """Daily Focus Score section."""
    header_h = 7 * mm
    draw_section_header(c, x, y + h - header_h, w, header_h, "DAILY FOCUS SCORE", GREEN)
    draw_rounded_rect(c, x, y, w, h - header_h, r=3, fill=GREEN_LIGHT, stroke=GREEN, stroke_width=0.5)

    items = [
        "Deep Work সম্পন্ন",
        "Distraction Control",
        "Healthy Habits",
        "Important Tasks Completed",
    ]

    body_h = h - header_h - 14 * mm
    row_h = body_h / 4
    start_y = y + h - header_h - 6 * mm

    for i, item in enumerate(items):
        row_y = start_y - (i + 1) * row_h
        if "সম্পন্ন" in item:
            draw_bengali(c, x + 3 * mm, row_y, item, size=6.5)
        else:
            c.setFont("Helvetica", 7)
            c.setFillColor(TEXT_DARK)
            c.drawString(x + 3 * mm, row_y, item)

        score_x = x + w - 22 * mm
        draw_blank_line(c, score_x, row_y, 10 * mm, thickness=0.4)
        c.setFont("Helvetica", 7)
        c.drawString(score_x + 12 * mm, row_y, "/ 5")

    # Total score box
    total_box_h = 10 * mm
    total_y = y + 3 * mm
    draw_rounded_rect(c, x + 3 * mm, total_y, w - 6 * mm, total_box_h, r=3, fill=colors.white, stroke=GREEN)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(GREEN)
    c.drawString(x + 6 * mm, total_y + 3 * mm, "Total Score:")
    draw_blank_line(c, x + 30 * mm, total_y + 3.5 * mm, 15 * mm)
    c.drawString(x + 48 * mm, total_y + 3 * mm, "/ 20")


def draw_footer(c):
    """Draw inspirational footer quote."""
    c.setFillColor(GREEN)
    c.setFont("NotoBengali", 9)
    c.drawCentredString(PAGE_W / 2, MARGIN - 2 * mm, '"সামান্য উন্নতি, প্রতিদিন!"')


def generate_pdf(output_path):
    """Generate the complete tracker PDF."""
    c = canvas.Canvas(output_path, pagesize=A4)
    c.setTitle("Daily Focus Tracker")
    c.setAuthor("Daily Focus Tracker")

    content_top = draw_header(c)

    # Grid layout dimensions
    col_w = (CONTENT_W - GAP) / 2
    row1_h = 52 * mm
    row2_h = 42 * mm
    row3_h = 32 * mm
    row4_h = CONTENT_H - (PAGE_H - content_top) - row1_h - row2_h - row3_h - 4 * GAP - 8 * mm

    y_cursor = content_top - GAP

    # Row 1: MITs + Deep Work
    y1 = y_cursor - row1_h
    draw_mits_section(c, MARGIN, y1, col_w, row1_h)
    draw_deep_work_section(c, MARGIN + col_w + GAP, y1, col_w, row1_h)
    y_cursor = y1 - GAP

    # Row 2: Distraction + Brain Energy
    y2 = y_cursor - row2_h
    draw_distraction_section(c, MARGIN, y2, col_w, row2_h)
    draw_brain_energy_section(c, MARGIN + col_w + GAP, y2, col_w, row2_h)
    y_cursor = y2 - GAP

    # Row 3: Neuroscience Habits (full width)
    y3 = y_cursor - row3_h
    draw_neuroscience_habits(c, MARGIN, y3, CONTENT_W, row3_h)
    y_cursor = y3 - GAP

    # Row 4: Reflection + Focus Score
    y4 = y_cursor - row4_h
    draw_reflection_section(c, MARGIN, y4, col_w, row4_h)
    draw_focus_score_section(c, MARGIN + col_w + GAP, y4, col_w, row4_h)

    draw_footer(c)

    c.save()
    print(f"Generated: {output_path}")


if __name__ == "__main__":
    generate_pdf("/workspace/Daily_Focus_Tracker.pdf")
