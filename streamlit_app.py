from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent


def inline_static_app() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    js = (ROOT / "app.js").read_text(encoding="utf-8")

    html = html.replace('<link rel="stylesheet" href="styles.css" />', f"<style>{css}</style>")
    html = html.replace('<script src="app.js"></script>', f"<script>{js}</script>")
    return html


st.set_page_config(
    page_title="图像滤波实验台",
    page_icon="🖼️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

components.html(inline_static_app(), height=1500, scrolling=True)
