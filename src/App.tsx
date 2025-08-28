import { useRef, useState, useCallback } from "react";
import "./App.css";
import type {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng/esm";

import {
  VERSION,
  createClient,
  createCameraVideoTrack,
  createMicrophoneAudioTrack,
  onCameraChanged,
  onMicrophoneChanged,
  setParameter,
  setLogLevel,
  enableLogUpload,
} from "agora-rtc-sdk-ng/esm";

// Beauty Extension 추가
import BeautyExtension from "agora-extension-beauty-effect";
import AgoraRTC from "agora-rtc-sdk-ng";

console.log("Current SDK VERSION: ", VERSION);

onCameraChanged(device => {
  console.log("onCameraChanged: ", device);
});
onMicrophoneChanged(device => {
  console.log("onMicrophoneChanged: ", device);
});

const client: IAgoraRTCClient = createClient({
  mode: "rtc",
  codec: "vp8",
});

// Beauty Extension 초기화
const extension = new BeautyExtension();
AgoraRTC.registerExtensions([extension]);
const processor = extension.createProcessor();

let audioTrack: IMicrophoneAudioTrack;
let videoTrack: ICameraVideoTrack;

// Beauty 옵션 인터페이스
interface BeautyOptions {
  smoothnessLevel: number;
  sharpnessLevel: number;
  lighteningLevel: number;
  rednessLevel: number;
  lighteningContrastLevel: number;
}

function App() {
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioPubed, setIsAudioPubed] = useState(false);
  const [isVideoPubed, setIsVideoPubed] = useState(false);
  const [isVideoSubed, setIsVideoSubed] = useState(false);

  // Beauty 관련 상태 추가
  const [beautyEnabled, setBeautyEnabled] = useState(false);
  const [beautyOptions, setBeautyOptions] = useState<BeautyOptions>({
    smoothnessLevel: 0.6,
    sharpnessLevel: 0.5,
    lighteningLevel: 0.7,
    rednessLevel: 0.5,
    lighteningContrastLevel: 2,
  });

  const turnOnCamera = async (flag?: boolean) => {
    flag = flag ?? !isVideoOn;
    setIsVideoOn(flag);

    if (videoTrack) {
      return videoTrack.setEnabled(flag);
    }
    videoTrack = await createCameraVideoTrack();
    videoTrack.play("camera-video");

    // Beauty processor 연결 추가
    if (processor && videoTrack) {
      videoTrack.pipe(processor).pipe(videoTrack.processorDestination);
    }
  };

  const turnOnMicrophone = async (flag?: boolean) => {
    flag = flag ?? !isAudioOn;
    setIsAudioOn(flag);

    if (audioTrack) {
      return audioTrack.setEnabled(flag);
    }

    audioTrack = await createMicrophoneAudioTrack();
  };

  const [isJoined, setIsJoined] = useState(false);
  const channel = useRef("");
  const appid = useRef("");
  const token = useRef("");

  const joinChannel = async () => {
    setLogLevel(1);
    enableLogUpload();
    setParameter("EXPERIMENTS", { netqSensitivityMode: 1 });

    if (!channel.current) {
      channel.current = "react-room";
    }

    if (isJoined) {
      await leaveChannel();
    }

    client.on("user-published", onUserPublish);

    await client.join(
      appid.current,
      channel.current,
      token.current || null,
      null
    );
    setIsJoined(true);
  };

  const leaveChannel = async () => {
    setIsJoined(false);
    setIsAudioPubed(false);
    setIsVideoPubed(false);
    setBeautyEnabled(false); // Beauty 상태 초기화

    await client.leave();
  };

  const onUserPublish = async (
    user: IAgoraRTCRemoteUser,
    mediaType: "video" | "audio"
  ) => {
    if (mediaType === "video") {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play("remote-video");
      setIsVideoSubed(true);
    }
    if (mediaType === "audio") {
      const remoteTrack = await client.subscribe(user, mediaType);
      remoteTrack.play();
    }
  };

  const publishVideo = async () => {
    await turnOnCamera(true);

    if (!isJoined) {
      await joinChannel();
    }
    await client.publish(videoTrack);
    setIsVideoPubed(true);
  };

  const publishAudio = async () => {
    await turnOnMicrophone(true);

    if (!isJoined) {
      await joinChannel();
    }

    await client.publish(audioTrack);
    setIsAudioPubed(true);
  };

  // Beauty 효과 활성화/비활성화
  const toggleBeauty = useCallback(async () => {
    if (!processor || !videoTrack) return;

    try {
      if (beautyEnabled) {
        await processor.disable();
        setBeautyEnabled(false);
        console.log("Beauty 효과 비활성화");
      } else {
        await processor.enable();
        setBeautyEnabled(true);
        console.log("Beauty 효과 활성화");
      }
    } catch (error) {
      console.error("Beauty 효과 토글 실패:", error);
    }
  }, [beautyEnabled]);

  // Beauty 옵션 업데이트
  const updateBeautyOptions = useCallback(
    (newOptions: Partial<BeautyOptions>) => {
      if (processor) {
        const updatedOptions = { ...beautyOptions, ...newOptions };
        processor.setOptions(updatedOptions);
        setBeautyOptions(updatedOptions);
      }
    },
    [beautyOptions]
  );

  // Beauty 슬라이더 핸들러들
  const handleSoftenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const smoothnessLevel = parseInt(e.target.value) / 100;
    updateBeautyOptions({ smoothnessLevel });
  };

  const handleSharpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sharpnessLevel = parseInt(e.target.value) / 100;
    updateBeautyOptions({ sharpnessLevel });
  };

  const handleWhiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lighteningLevel = parseInt(e.target.value) / 100;
    updateBeautyOptions({ lighteningLevel });
  };

  const handleRednessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rednessLevel = parseInt(e.target.value) / 100;
    updateBeautyOptions({ rednessLevel });
  };

  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lighteningContrastLevel = parseInt(e.target.value);
    updateBeautyOptions({ lighteningContrastLevel });
  };

  return (
    <>
      <div className="left-side">
        <h3>Please check your camera / microphone!</h3>
        <div className="buttons">
          <button
            onClick={() => turnOnCamera()}
            className={isVideoOn ? "button-on" : ""}>
            Turn {isVideoOn ? "off" : "on"} camera
          </button>
          <button
            onClick={() => turnOnMicrophone()}
            className={isAudioOn ? "button-on" : ""}>
            Turn {isAudioOn ? "off" : "on"} Microphone
          </button>
        </div>

        {/* Beauty Controls 추가 */}
        {isVideoOn && (
          <div className="beauty-section">
            <h3>Beauty Effects</h3>
            <div className="buttons">
              <button
                onClick={toggleBeauty}
                className={beautyEnabled ? "button-on" : ""}>
                Beauty {beautyEnabled ? "OFF" : "ON"}
              </button>
            </div>

            {beautyEnabled && (
              <div className="beauty-controls">
                <div className="slider-group">
                  <label>
                    부드러움: {beautyOptions.smoothnessLevel.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={beautyOptions.smoothnessLevel * 100}
                    onChange={handleSoftenChange}
                  />
                </div>

                <div className="slider-group">
                  <label>
                    선명도: {beautyOptions.sharpnessLevel.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={beautyOptions.sharpnessLevel * 100}
                    onChange={handleSharpChange}
                  />
                </div>

                <div className="slider-group">
                  <label>
                    밝기: {beautyOptions.lighteningLevel.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={beautyOptions.lighteningLevel * 100}
                    onChange={handleWhiteChange}
                  />
                </div>

                <div className="slider-group">
                  <label>홍조: {beautyOptions.rednessLevel.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={beautyOptions.rednessLevel * 100}
                    onChange={handleRednessChange}
                  />
                </div>

                <div className="slider-group">
                  <label>대비: {beautyOptions.lighteningContrastLevel}</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={beautyOptions.lighteningContrastLevel}
                    onChange={handleContrastChange}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <h3>
          {`Please input the appid and token (`}
          <a href="https://www.agora.io/en/blog/how-to-get-started-with-agora">
            Create an account.
          </a>
          {`) `}
        </h3>
        <input
          defaultValue={appid.current}
          placeholder="appid"
          onChange={e => (appid.current = e.target.value)}
        />
        <input
          defaultValue={token.current}
          placeholder="token"
          onChange={e => (token.current = e.target.value)}
        />
        <h3>Please input the channel name</h3>
        <input
          defaultValue={channel.current}
          onChange={e => (channel.current = e.target.value)}
        />
        <div className="buttons">
          <button onClick={joinChannel} className={isJoined ? "button-on" : ""}>
            Join Channel
          </button>
          <button
            onClick={publishVideo}
            className={isVideoPubed ? "button-on" : ""}>
            Publish Video
          </button>
          <button
            onClick={publishAudio}
            className={isAudioPubed ? "button-on" : ""}>
            Publish Audio
          </button>
          <button onClick={leaveChannel}>Leave Channel</button>
        </div>
      </div>
      <div className="right-side">
        <video id="camera-video" hidden={isVideoOn ? false : true}></video>
        <video id="remote-video" hidden={isVideoSubed ? false : true}></video>
        {isJoined && !isVideoSubed ? (
          <div className="waiting">
            You can share channel {channel.current} to others.....
          </div>
        ) : null}
      </div>
    </>
  );
}

export default App;
