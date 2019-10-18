# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://vagrantcloud.com/search.
  config.vm.box = "centos/7"

  # Shared folder configuration
  config.vm.synced_folder ".", "/vagrant", type: "rsync", rsync__exclude: ['./clock-in_web/']

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  # NOTE: This will enable public access to the opened port
  # config.vm.network "forwarded_port", guest: 80, host: 8080

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine and only allow access
  # via 127.0.0.1 to disable public access
  
  # API
  config.vm.network "forwarded_port", guest: 8080, host: 8080, host_ip: "127.0.0.1"
  # Web server
  config.vm.network "forwarded_port", guest: 80, host: 8081, host_ip: "127.0.0.1"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  # config.vm.network "private_network", ip: "192.168.33.10"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  # config.vm.synced_folder "../data", "/vagrant_data"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  # config.vm.provider "virtualbox" do |vb|
  #   # Display the VirtualBox GUI when booting the machine
  #   vb.gui = true
  #
  #   # Customize the amount of memory on the VM:
  #   vb.memory = "1024"
  # end
  #
  # View the documentation for the provider you are using for more
  # information on available options.

  # Enable provisioning with a shell script. Additional provisioners such as
  # Puppet, Chef, Ansible, Salt, and Docker are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision "shell", inline: <<-SHELL
    # Update and install required packages
    yum update -y
    yum install -y vim gcc-c++ make

    # Node repository and installation
    curl -sL https://rpm.nodesource.com/setup_12.x | sudo -E bash -
    yum install -y nodejs 

    # Nginx installation
    yum install -y epel-release
    yum install -y nginx 
    mkdir /var/www/html
    chwon vagrant:vagrant /var/www/html

    # MariaDB installation
    yum install -y mariadb-server
 
    # Server installation
    mkdir /opt/clock-in_server/
    cp -aR /vagrant/clock-in_server/* /opt/clock-in_server/
    npm --prefix /opt/clock-in_server install /opt/clock-in_server --unsafe-perm
    chown vagrant:vagrant /opt/clock-in_server/

    # Locale and time
    timedatectl set-timezone 'Europe/Madrid'
    export TZ='Europe/Madrid'
    #localectl set-locale LANG=es_ES.utf8

    # Start and enable services
    systemctl start firewalld
    systemctl enable firewalld
    systemctl start mariadb
    systemctl enable mariadb
    systemctl start nginx
    systemctl enable nginx
    
    #  -> Disable SELinux? (had issues with tftp boot)
    setenforce 0
  
    # Firewall configuration
    firewall-cmd --permanent --zone=public --add-service=http
    firewall-cmd --permanent --zone=public --add-service=https
    firewall-cmd --permanent --set-target=ACCEPT
    #  -> Reload firewall rules
    firewall-cmd --reload

    # MySQL secure installation
    #mysql_secure_installation
    SHELL
end
