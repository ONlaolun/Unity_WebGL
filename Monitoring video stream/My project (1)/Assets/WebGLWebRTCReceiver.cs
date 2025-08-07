using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.UI;

public class WebGLWebRTCReceiver : MonoBehaviour
{
    [Header("UI")]
    public RawImage rawImage;
    public int videoWidth = 1920;
    public int videoHeight = 1080;
    public string videoElementId = "unity_webrtc_video";
    public string whepUrl = "http://192.168.1.100:8889/my_camera/whep"; // �滻Ϊ���ʵ��WHEP��ַ

    private Texture2D videoTexture;
    private byte[] pixelBuffer;
    private GCHandle pixelHandle;
    private IntPtr pixelPtr;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void StartWebRTC(string videoElementId, string unityObjectName, string unityMethodName, string whepUrl);

    [DllImport("__Internal")]
    private static extern int GetVideoFrame(string videoElementId, IntPtr bufferPtr, int width, int height);
#endif

    void Start()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
    Debug.Log("=== WebGLWebRTCReceiver Start() called ===");
    Debug.Log("whepUrl: " + whepUrl);
    Debug.Log("videoElementId: " + videoElementId);

    videoTexture = new Texture2D(videoWidth, videoHeight, TextureFormat.RGBA32, false);
    pixelBuffer = new byte[videoWidth * videoHeight * 4];
    pixelHandle = GCHandle.Alloc(pixelBuffer, GCHandleType.Pinned);
    pixelPtr = pixelHandle.AddrOfPinnedObject();

    rawImage.texture = videoTexture;
    rawImage.color = Color.white;

    StartWebRTC(videoElementId, gameObject.name, "OnWebRTCReady", whepUrl);
    Debug.Log("=== StartWebRTC() called ===");
#endif
    }

    // JS֪ͨUnity��Ƶ����׼����
    public void OnWebRTCReady(string videoId)
    {
        Debug.Log("WebRTC��Ƶ����׼����: " + videoId);
    }

    void Update()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
    if (videoTexture != null)
    {
        int ok = GetVideoFrame(videoElementId, pixelPtr, videoWidth, videoHeight);
        if (ok == 1)
        {
            videoTexture.LoadRawTextureData(pixelBuffer);
            videoTexture.Apply();
            // �ӵ�����־
            if (Time.frameCount % 60 == 0) // ÿ60֡���һ��
            {
                Debug.Log("Video frame updated successfully");
            }
        }
        else
        {
            // �ӵ�����־
            if (Time.frameCount % 60 == 0)
            {
                Debug.Log("GetVideoFrame returned 0, video not ready");
            }
        }
    }
#endif
    }

    void OnDestroy()
    {
        if (pixelHandle.IsAllocated)
            pixelHandle.Free();
    }
}