mergeInto(LibraryManager.library, {
  StartWebRTC: function (videoElementIdPtr, unityObjectNamePtr, unityMethodNamePtr, whepUrlPtr) {
    var videoId = UTF8ToString(videoElementIdPtr);
    var unityObj = UTF8ToString(unityObjectNamePtr);
    var unityMethod = UTF8ToString(unityMethodNamePtr);
    var whepUrl = UTF8ToString(whepUrlPtr);

    console.log("StartWebRTC called", videoId, whepUrl);

    var video = document.getElementById(videoId);
    if (!video) {
      video = document.createElement('video');
      video.id = videoId;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      // 添加到DOM但隐藏，确保video能正常播放
      video.style.position = 'absolute';
      video.style.left = '-9999px';
      video.style.top = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';
      document.body.appendChild(video);
    }

    var pc = new RTCPeerConnection();

    // 添加 video transceiver，确保ICE启动
    pc.addTransceiver('video', { direction: 'recvonly' });

    // 监听canplay事件
    video.addEventListener('canplay', function() {
      console.log("Video canplay event fired, readyState:", video.readyState);
    });

    pc.ontrack = function (event) {
      console.log("WebRTC: OnTrack event received");
      video.srcObject = event.streams[0];
      // 强制播放
      var playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(_ => {
          console.log("Video play() success");
          SendMessage(unityObj, unityMethod, video.id);
        }).catch(e => {
          console.warn("Video play() failed:", e);
          SendMessage(unityObj, unityMethod, video.id);
        });
      } else {
        SendMessage(unityObj, unityMethod, video.id);
      }
    };

    pc.onicecandidate = function (event) {
      if (event.candidate === null) {
        console.log("ICE gathering complete, sending offer to:", whepUrl);
        fetch(whepUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            "Accept": "application/sdp"
          },
          body: pc.localDescription.sdp
        })
        .then(function (response) {
          if (!response.ok) throw new Error("WHEP信令服务器响应失败: " + response.status);
          return response.text();
        })
        .then(function (answerSdp) {
          if (!answerSdp || answerSdp.trim() === "") {
            throw new Error("服务器返回的SDP为空");
          }
          if (answerSdp.indexOf("ice-ufrag") === -1) {
            console.warn("警告: 服务器返回的SDP不包含ice-ufrag");
          }
          var answer = new RTCSessionDescription({ type: "answer", sdp: answerSdp });
          return pc.setRemoteDescription(answer);
        })
        .then(function() {
          console.log("Remote description set successfully");
        })
        .catch(function (err) {
          console.error("WebRTC/WHEP error:", err);
          alert("WebRTC/WHEP error: " + err);
        });
      }
    };

    pc.createOffer().then(function (offer) {
      console.log("Offer created");
      return pc.setLocalDescription(offer);
    }).catch(function(err) {
      console.error("Error creating offer:", err);
      alert("Error creating offer: " + err);
    });
  },

  GetVideoFrame: function (videoElementIdPtr, bufferPtr, width, height) {
    var videoId = UTF8ToString(videoElementIdPtr);
    var video = document.getElementById(videoId);
    if (!video || video.readyState < 2) {
      // readyState < 2 表示没有足够数据
      // 0: HAVE_NOTHING, 1: HAVE_METADATA, 2: HAVE_CURRENT_DATA, 3: HAVE_FUTURE_DATA, 4: HAVE_ENOUGH_DATA
      // 只在有数据时才抓帧
      // console.log("Video not ready, readyState:", video ? video.readyState : "null");
      return 0;
    }
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(video, 0, -height, width, height);
    ctx.restore();
    var imageData = ctx.getImageData(0, 0, width, height);
    HEAPU8.set(imageData.data, bufferPtr);
    return 1;
  }
});