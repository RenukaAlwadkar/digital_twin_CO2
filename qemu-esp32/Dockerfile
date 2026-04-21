FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV IDF_PATH=/opt/esp/idf
ENV IDF_TOOLS_PATH=/opt/esp/tools
ENV PATH=${IDF_PATH}/tools:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    wget \
    curl \
    xz-utils \
    flex \
    bison \
    gperf \
    python3 \
    python3-pip \
    python3-venv \
    ninja-build \
    cmake \
    ccache \
    libffi-dev \
    libssl-dev \
    dfu-util \
    libusb-1.0-0 \
    net-tools \
    iproute2 \
    iptables \
    iputils-ping \
    bridge-utils \
    socat \
    pkg-config \
    nano \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/esp
WORKDIR /opt/esp

# Espressif's official ESP-IDF with QEMU support hooks.
RUN git clone --depth=1 --recursive https://github.com/espressif/esp-idf.git idf

WORKDIR /opt/esp/idf
RUN ./install.sh esp32

RUN python3 -m pip install --no-cache-dir --upgrade pip

WORKDIR /workspace
COPY qemu-esp32/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
