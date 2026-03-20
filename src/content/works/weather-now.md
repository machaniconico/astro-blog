---
title: "WeatherNow - 天気予報アプリ"
description: "位置情報を使ったリアルタイム天気予報Webアプリ。美しいアニメーションで現在の天気と週間予報を表示する。"
techStack: ["Vue.js", "Node.js", "OpenWeather API", "CSS Animations"]
liveUrl: "https://example.com/weather"
githubUrl: "https://github.com/example/weather-now"
pubDate: 2024-02-20
---

## 概要

ブラウザの位置情報APIとOpenWeather APIを組み合わせた天気予報アプリです。
天気の状態によって背景アニメーションが変わる演出にこだわりました。

## 主な機能

- 現在地の天気をワンタップで取得
- 1週間の天気予報表示
- 天気に連動した背景アニメーション（晴れ/雨/雪/曇り）
- 都市名での検索機能

## こだわりポイント

CSSアニメーションだけで雨粒や雪を表現するのに挑戦しました。
JavaScriptを使わずに純粋なCSSで動きを表現することで、パフォーマンスを保ちつつリッチな見た目を実現しています。
