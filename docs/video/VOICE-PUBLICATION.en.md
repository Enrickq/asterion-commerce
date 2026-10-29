# Selected voice and publication checks

Checked 28 October 2026. The owner selected the original **2:45 neural launch film, The Right to Spend**, after comparing narration versions. Its [YouTube publication](https://www.youtube.com/watch?v=l_cS_-SIsdQ) has passed anonymous-access and browser checks; [the publication record](../evidence/youtube-publication.json) documents the observed duration, public visibility, playable state, metadata and AI disclosure. Publishing the exact selectable caption track remains open. These checks are not individual clearance from the organizers or YouTube.

## Selected media

- Film: `output/ASTERION-The-Right-to-Spend-2026-10-26.mp4`, 165 seconds, 1920 × 1080, 30 fps.
- Public video verified October 28: https://www.youtube.com/watch?v=l_cS_-SIsdQ.
- Captions: [ASTERION-Launch-Captions.en.srt](ASTERION-Launch-Captions.en.srt), 64 phrase-aligned English cues. Use these timings with this film.
- Voice: Kokoro `af_heart`, `kokoro-js 1.2.1`, `onnx-community/Kokoro-82M-v1.0-ONNX`, q8 CPU inference performed locally. No custom voice clone was made and no named speaker is represented.

The local voice preset has SHA-256 `d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b`, matching the [published ONNX voice file](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/blob/main/voices/af_heart.bin). The script, generation settings, timings and retained package license are recorded in private build artifacts.

## License scope

The [Kokoro JavaScript package](https://github.com/hexgrad/kokoro/blob/main/kokoro.js/package.json) and [ONNX model](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) declare Apache-2.0. The [base model card](https://huggingface.co/hexgrad/Kokoro-82M) describes production and commercial deployments. No separate restriction for `af_heart` was identified in the inspected package or model documentation.

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0) grants use and distribution rights under its conditions, including license and applicable notice preservation when redistributing the licensed work or derivatives. It does not guarantee every possible use, resolve all third-party rights or grant an endorsement. This review does not treat generated narration as an automatic transfer of every right in the model. The [prepared description](YOUTUBE-LAUNCH.en.md) credits the exact voice, engine and model.

## Competition and YouTube

The [official hackathon rules](https://paypalaihackathon.devpost.com/rules) require a public YouTube demonstration under three minutes showing the project functioning and require the entrant to hold the necessary rights. No requirement for a human narrator or prohibition of synthetic narration was identified in those rules or the [official FAQ](https://paypalaihackathon.devpost.com/details/faqs) inspected on this date. This is a reading of the published text, not organizer approval of this particular submission.

The public page displays the AI disclosure. Preserve **AI use / Uso de IA: Yes / Sí** for the realistic AI-generated landscape and the credited neural narration. [YouTube's official guidance](https://support.google.com/youtube/answer/14328491?hl=en&co=GENIE.Platform%3DDesktop) requires disclosure for realistic generated or meaningfully altered content and provides this upload setting. YouTube controls the resulting platform labels. The inspected guidance does not require adding a permanent manual review panel to the video.

The selectable English caption track observed on October 28 is automatic (`kind=asr`) and includes a recognition error for “La Palma.” Publishing the exact [64-cue SRT](ASTERION-Launch-Captions.en.srt) remains pending. This is a quality/accessibility improvement, not an additional rule inferred from the competition's language requirement.

The existing simulation, historical PayPal Sandbox and fixture-weather labels remain essential to the demo's factual scope. The film is an edited demonstration with historical provider evidence, not continuous footage of a new private execution. The public-video checks do not establish a submitted Devpost entry or a subjective listening assessment. Participant details and final submission remain open; this review does not predict eligibility, moderation outcomes or prizes.
