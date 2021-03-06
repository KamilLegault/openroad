#!/bin/bash

# Builds an Amazon Machine Image

set -x

DIR=`dirname $0`
FILELIST="$DIR/files/FILES"

UBUNTU_IMAGE_BASENAME='precise-server-cloudimg-amd64.img'
UBUNTU_IMAGE_ARCHIVE_BASENAME='precise-server-cloudimg-amd64.tar.gz'
UBUNTU_IMAGE_URL='http://uec-images.ubuntu.com/precise/current/'"$UBUNTU_IMAGE_ARCHIVE_BASENAME"
UBUNTU_IMAGE_ARCHIVE_FILENAME="$DIR/$UBUNTU_IMAGE_ARCHIVE_BASENAME"
UBUNTU_IMAGE_FILENAME="$DIR/$UBUNTU_IMAGE_BASENAME"
APT_PROXY='http://127.0.0.1:3142/ubuntu'
MOUNT_DIR="$DIR/root"

[ -f "$UBUNTU_IMAGE_ARCHIVE_FILENAME" ] || wget $UBUNTU_IMAGE_URL -O $UBUNTU_IMAGE_ARCHIVE_FILENAME
[ -f "$UBUNTU_IMAGE_FILENAME" ] || tar xzf "$UBUNTU_IMAGE_ARCHIVE_FILENAME"

sudo umount -f "$MOUNT_DIR"
rmdir "$MOUNT_DIR"
mkdir "$MOUNT_DIR"
sudo mount -o loop "$UBUNTU_IMAGE_FILENAME" "$MOUNT_DIR"

pg_dump -Fc -O -f "$DIR/bikefile-data.psql" bikefile

# Set up chroot-i-ness
#sudo cp /etc/resolv.conf "$MOUNT_DIR"/etc/resolv.conf
sudo chroot "$MOUNT_DIR" mount -t proc none /proc
# Disable starting services while installing
cat <<EOF | sudo tee "$MOUNT_DIR"/usr/sbin/policy-rc.d > /dev/null
#!/bin/sh
exit 101
EOF
sudo chmod 755 "$MOUNT_DIR"/usr/sbin/policy-rc.d

cat "$FILELIST" | while read -a line; do
  orig=${line[0]}
  dest=${line[1]}
  sudo mkdir -p "$MOUNT_DIR"`dirname $dest`
  sudo cp -r "$orig" "$MOUNT_DIR""$dest"
  sudo chown -R root:root "$MOUNT_DIR""$dest"
done

sudo chown -R 1000:1000 "$MOUNT_DIR"/opt/bikefile

sudo chroot "$MOUNT_DIR" update-rc.d bikefile_uwsgi defaults 80 80

sudo chroot "$MOUNT_DIR" /usr/bin/env `cat "$DIR"/locale` locale-gen en_US.UTF-8

# Install packages
sudo chroot "$MOUNT_DIR" env LANG="en_US.UTF-8" apt-get install \
  -y \
  postgresql-9.1-postgis \
  python-psycopg2 \
  uwsgi-plugin-python \
  nginx-full \
  acpid \
  bind9-host \
  openssh-server \

sudo rm -f "$MOUNT_DIR"/etc/nginx/sites-enabled/default
sudo chroot "$MOUNT_DIR" ln -sf /etc/nginx/sites-available/bikefile /etc/nginx/sites-enabled/bikefile

sudo cp "$DIR"/files/postgresql.conf "$MOUNT_DIR"/etc/postgresql/9.1/main
sudo chown root:root "$MOUNT_DIR"/etc/postgresql/9.1/main/postgresql.conf

# nginx won't start unless the log directory exists
sudo chroot "$MOUNT_DIR" mkdir -p /opt/bikefile/log
sudo chroot "$MOUNT_DIR" chown 1000:1000 /opt/bikefile/log

# Clean up
sudo chroot "$MOUNT_DIR" apt-get clean
sudo chroot "$MOUNT_DIR" umount /proc
sudo rm "$MOUNT_DIR"/usr/sbin/policy-rc.d

sudo umount -f "$MOUNT_DIR"
rmdir "$MOUNT_DIR"
