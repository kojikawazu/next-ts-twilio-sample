import { useEffect, useState, useRef } from 'react';
import { 
  Room, 
  Participant, 
  VideoTrackPublication, 
  LocalVideoTrack, 
  AudioTrackPublication, 
  AudioTrack, 
  LocalAudioTrack 
} from 'twilio-video';

export default function Home() {
  // Twilioのトークンを保持するためのstate
  const [token, setToken] = useState<string | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  // ビデオが有効かどうかを示すstate
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  // マイクが有効かどうかを示すstate
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  // ローカルのビデオを表示するためのDOMへの参照
  const localVideoRef = useRef<HTMLDivElement>(null);
  // リモートのビデオを表示するためのDOMへの参照
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  //  ローカルのビデオトラックを保持するためのstate
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  // 音量を保持するための新しい状態
  const [volume, setVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
  }, []);

  // コンポーネントがマウントされたときにTwilioのトークンを非同期的に取得
  useEffect(() => {
    // トークンを取得する関数
    const fetchToken = async () => {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'your-identity', roomName: 'your-room-name' }),
      });
      const data = await response.json();
      setToken(data.token);
    };

    fetchToken();
  }, []);

  // トークンが取得されたら、Twilioに接続し、ローカルのビデオとリモートのビデオをそれぞれのdivにアタッチ
  useEffect(() => {
    if (token) {
      // Twilioのビデオライブラリからconnect関数をインポート
      const { connect } = require('twilio-video');
  
      // トークンを使用してTwilioのビデオルームに接続します。この接続は、ビデオとオーディオの両方を有効にしています。
      connect(token, { video: true, audio: true }).then((room: Room) => {
        setRoom(room);
        
        // Attach the local video
        // ローカルのビデオトラックを取得し、それをlocalVideoRefにアタッチします。これにより、ユーザーのビデオが表示されます。
        room.localParticipant.videoTracks.forEach((trackPublication: VideoTrackPublication) => {
          const track = trackPublication.track;
          if (track) {
            console.log("debug2");
            localVideoRef.current?.appendChild(track.attach());
            setLocalVideoTrack(track as LocalVideoTrack);
          }
        });
  
        // Attach video tracks of all participants
        // すでにルームにいるすべての参加者のビデオトラックを取得し、それをremoteVideoRefにアタッチします。これにより、他の参加者のビデオが表示されます。
        room.participants.forEach((participant: Participant) => {
          participant.videoTracks.forEach((trackPublication: VideoTrackPublication) => {
            const track = trackPublication.track;
            if (track) {
              console.log("debug3");
              remoteVideoRef.current?.appendChild(track.attach());
            }
          });
        });
  
        // When a new participant joins, attach their video tracks
        // 新しい参加者がルームに参加したときのイベントリスナーを設定します。
        // 新しい参加者が参加すると、その参加者のビデオトラックを取得し、それをremoteVideoRefにアタッチします。
        room.localParticipant.audioTracks.forEach((audioTrackPublication: AudioTrackPublication) => {
          console.log("debug4");

          const audioTrack = audioTrackPublication.track;
          console.log(audioTrack);
          if (audioTrack) {
            console.log("debug4-1");

            const source    = audioContextRef.current?.createMediaStreamSource(new MediaStream([audioTrack.mediaStreamTrack]));
            const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
            source?.connect(analyserRef.current!);
            if (audioContextRef.current?.state === 'suspended') {
              audioContextRef.current?.resume();
              console.log(audioContextRef.current?.state);
            }

            const checkVolumeInterval = setInterval(() => {
              analyserRef.current!.getByteFrequencyData(dataArray);
              const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
              console.log(volume);

              // ここでボリュームのしきい値を設定してください
              const VOLUME_THRESHOLD = 5; // この値は調整が必要です

              if (volume > VOLUME_THRESHOLD) {
                console.log(`自分の音声が聞こえています`);
              } else {
                console.log(`自分の音声が聞こえていません`);
              }

            }, 500);
          }
        });
  
      });
    }
  }, [token]);

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    if (isAudioEnabled) {
      room?.localParticipant.audioTracks.forEach((trackPublication: AudioTrackPublication) => {
        const track = trackPublication.track as LocalAudioTrack;
        track.disable();
      });
    } else {
      room?.localParticipant.audioTracks.forEach((trackPublication: AudioTrackPublication) => {
        const track = trackPublication.track as LocalAudioTrack;
        track.enable();
      });
    }
    setIsAudioEnabled(!isAudioEnabled);
  };

  return (
    <div>
      <div>Welcome to the video conference!</div>
      <div style={{ width: '50%', float: 'left', position: 'relative' }}>
        <div ref={localVideoRef} style={{ width: '100%', height: '250px' }}></div>
        {!isVideoEnabled && <div style={{ width: '100%', height: '220px', backgroundColor: 'black', position: 'absolute', top: 0, left: 0 }}></div>}
      </div>

      <div ref={remoteVideoRef} style={{ width: '50%', float: 'left' }}></div>

      <div style={{ clear: 'both' }}></div>
      
      <button onClick={toggleVideo}>
        {isVideoEnabled ? 'ビデオOFF' : 'ビデオON'}
      </button>
      <button onClick={toggleAudio}>
        {isAudioEnabled ? 'マイクOFF' : 'マイクON'}
      </button>
      <div style={{ width: `${volume}%`, height: '20px', backgroundColor: 'green' }}></div>
    </div>
  );
}
