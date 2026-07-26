import base64, json, sys
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

private = Ed25519PrivateKey.generate()
public = private.public_key()
print(json.dumps({
  "private_key_base64": base64.b64encode(private.private_bytes(serialization.Encoding.Raw,serialization.PrivateFormat.Raw,serialization.NoEncryption())).decode(),
  "public_key_base64": base64.b64encode(public.public_bytes(serialization.Encoding.Raw,serialization.PublicFormat.Raw)).decode()
}, indent=2))
print("Store the private key only on the client.", file=sys.stderr)
